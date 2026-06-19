import { KitchenConsumer } from "../consumers/kitchen.consumer.js";
import { mq } from "../utils/mq.js";
import { KitchenService } from "../services/kitchen.service.js";

jest.mock("../utils/mq.js", () => ({
    mq: {
        subscribe: jest.fn(),
    },
}));

jest.mock("../services/kitchen.service.js", () => ({
    KitchenService: {
        createJob: jest.fn(),
        markCompleted: jest.fn(),
        markFailed: jest.fn(),
    },
}));

describe("KitchenConsumer", () => {
    const orderId = "order-1";
    const userId = "user-1";
    const jobId = "job-1";

    let subscribedCallback: Function;

    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();

        // Capture the subscription callback
        (mq.subscribe as jest.Mock).mockImplementation(
            async (_queue, _event, callback) => {
                subscribedCallback = callback;
            }
        );
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    /* =========================================
       SUBSCRIPTION TEST
       ========================================= */

    it("should subscribe to inventory.order.queue", async () => {
        await KitchenConsumer();

        expect(mq.subscribe).toHaveBeenCalledWith(
            "inventory.order.queue",
            "order.created",
            expect.any(Function)
        );
    });

    /* =========================================
       SUCCESS FLOW
       ========================================= */

    it("should create job and mark completed after timeout", async () => {
        (KitchenService.createJob as jest.Mock).mockResolvedValue({
            id: jobId,
            orderId,
        });

        (KitchenService.markCompleted as jest.Mock).mockResolvedValue({});

        await KitchenConsumer();

        // simulate incoming MQ message
        await subscribedCallback({ orderId, userId });

        expect(KitchenService.createJob).toHaveBeenCalledWith(
            userId,
            orderId
        );

        // Fast-forward timers
        jest.runAllTimers();

        // Wait for async inside setTimeout
        await Promise.resolve();

        expect(KitchenService.markCompleted).toHaveBeenCalledWith(
            jobId
        );
    });

    /* =========================================
       FAILURE FLOW
       ========================================= */

    it("should call markFailed if markCompleted throws", async () => {
        (KitchenService.createJob as jest.Mock).mockResolvedValue({
            id: jobId,
            orderId,
        });

        (KitchenService.markCompleted as jest.Mock).mockRejectedValue(
            new Error("DB ERROR")
        );

        (KitchenService.markFailed as jest.Mock).mockResolvedValue({});

        await KitchenConsumer();

        await subscribedCallback({ orderId, userId });

        jest.runAllTimers();
        await Promise.resolve();

        expect(KitchenService.markCompleted).toHaveBeenCalled();

        expect(KitchenService.markFailed).toHaveBeenCalledWith(
            jobId,
            "DB ERROR"
        );
    });

    /* =========================================
       EMPTY MESSAGE
       ========================================= */

    it("should ignore empty message", async () => {
        await KitchenConsumer();

        await subscribedCallback(null);

        expect(KitchenService.createJob).not.toHaveBeenCalled();
    });
});