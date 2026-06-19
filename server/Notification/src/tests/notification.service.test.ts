import { NotificationService } from "../services/notification.service.js";
import { redis } from "../utils/redis.js";
import { createSession } from "better-sse";

jest.mock("../utils/redis", () => ({
    redis: {
        sAdd: jest.fn(),
        set: jest.fn(),
        get: jest.fn(),
        sRem: jest.fn(),
        del: jest.fn(),
        sMembers: jest.fn(),
    },
}));

jest.mock("better-sse", () => ({
    createSession: jest.fn(),
}));

describe("service", () => {
    const userId = "user-1";
    const orderId = "order-1";

    beforeEach(() => {
        jest.clearAllMocks();
    });
    let service: NotificationService;

    beforeEach(() => {
        jest.clearAllMocks();
        service = new NotificationService();
    });

    /* =========================================
       SESSION TESTS
       ========================================= */

    it("should register a session for a user", async () => {
        const mockPush = jest.fn();
        const mockOn = jest.fn();

        (createSession as jest.Mock).mockResolvedValue({
            push: mockPush,
            on: mockOn,
        });

        const req = {} as any;
        const res = {} as any;

        await service.registerSession(req, res, userId);

        expect(createSession).toHaveBeenCalled();
        expect(mockOn).toHaveBeenCalledWith("close", expect.any(Function));
    });

    it("should remove session when connection closes", async () => {
        let closeHandler: Function = () => { };
        const fakeSession = {
            push: jest.fn(),
            on: (event: string, cb: Function) => {
                if (event === "close") closeHandler = cb;
            },
        };

        (createSession as jest.Mock).mockResolvedValue(fakeSession);

        const req = {} as any;
        const res = {} as any;

        await service.registerSession(req, res, userId);

        // Ensure session exists
        expect(
            (service as any).sessions.get(userId).size
        ).toBe(1);

        // simulate disconnect
        closeHandler();

        // Now session map should not contain user
        expect(
            (service as any).sessions.has(userId)
        ).toBe(false);
    });

    /* =========================================
       ORDER REGISTRATION TESTS
       ========================================= */

    it("should register order in memory and redis", async () => {
        await service.registerOrder(userId, orderId);

        expect(redis.sAdd).toHaveBeenCalledWith(
            `user:orders:${userId}`,
            orderId
        );

        expect(redis.set).toHaveBeenCalledWith(
            `order:user:${orderId}`,
            userId
        );
    });

    it("should hydrate user orders from redis", async () => {
        (redis.sMembers as jest.Mock).mockResolvedValue([
            "order-1",
            "order-2",
        ]);

        await service.hydrateUserOrders(userId);

        const internalOrders = (service as any).userOrders.get(userId);

        expect(internalOrders.has("order-1")).toBe(true);
        expect(internalOrders.has("order-2")).toBe(true);
    });

    /* =========================================
       PUSH ORDER STATUS TESTS
       ========================================= */

    it("should push order status to active sessions", async () => {
        const mockPush = jest.fn();

        (createSession as jest.Mock).mockResolvedValue({
            push: mockPush,
            on: jest.fn(),
        });

        const req = {} as any;
        const res = {} as any;

        await service.registerSession(req, res, userId);

        await service.pushOrderStatus(
            userId,
            orderId,
            "PENDING"
        );

        expect(mockPush).toHaveBeenCalledWith(
            {
                orderId,
                status: "PENDING",
                timestamp: expect.any(Number),
            },
            "order-status"
        );
    });

    it("should remove order when status is READY", async () => {
        (redis.get as jest.Mock).mockResolvedValue(userId);

        await service.pushOrderStatus(
            userId,
            orderId,
            "READY"
        );

        expect(redis.sRem).toHaveBeenCalledWith(
            `user:orders:${userId}`,
            orderId
        );

        expect(redis.del).toHaveBeenCalledWith(
            `order:user:${orderId}`
        );
    });

    /* =========================================
       SYSTEM NOTIFICATION TEST
       ========================================= */

    it("should push system notification", async () => {
        const mockPush = jest.fn();

        (createSession as jest.Mock).mockResolvedValue({
            push: mockPush,
            on: jest.fn(),
        });

        const req = {} as any;
        const res = {} as any;

        await service.registerSession(req, res, userId);

        service.pushSystemNotification(
            userId,
            "Test message"
        );

        expect(mockPush).toHaveBeenCalledWith(
            {
                message: "Test message",
                timestamp: expect.any(Number),
            },
            "system"
        );
    });

    /* =========================================
       BROADCAST TEST
       ========================================= */

    it("should broadcast to all users", async () => {
        const push1 = jest.fn();
        const push2 = jest.fn();

        (createSession as jest.Mock)
            .mockResolvedValueOnce({
                push: push1,
                on: jest.fn(),
            })
            .mockResolvedValueOnce({
                push: push2,
                on: jest.fn(),
            });

        const req = {} as any;
        const res = {} as any;

        await service.registerSession(req, res, "user1");
        await service.registerSession(req, res, "user2");

        service.pushBroadcast("global", { data: 123 });

        expect(push1).toHaveBeenCalled();
        expect(push2).toHaveBeenCalled();
    });
});