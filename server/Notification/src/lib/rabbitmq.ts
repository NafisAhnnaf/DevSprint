import amqp, { Channel, ConsumeMessage, Connection, ChannelModel } from "amqplib";

type MessageHandler = (data: any) => Promise<void>;

export class RabbitMQ {
    public connection: ChannelModel | null = null;
    private channel: Channel | null = null;
    public readonly url: string;
    private readonly exchange: string;

    constructor(url: string, exchange: string) {
        this.url = url;
        this.exchange = exchange;
    }

    async connect(): Promise<void> {
        if (this.connection && this.channel) return;

        try {
            this.connection = await amqp.connect(this.url);

            this.connection.on("close", () => {
                console.error("RabbitMQ connection closed. Reconnecting...");
                this.connection = null;
                this.channel = null;
                setTimeout(() => this.connect(), 5000);
            });

            this.connection.on("error", (err) => {
                console.error("RabbitMQ connection error:", err);
            });

            this.channel = await this.connection.createChannel();
            await this.channel.assertExchange(this.exchange, "topic", { durable: true });

            console.log("RabbitMQ connected");
        } catch (err) {
            console.error("Failed to connect to RabbitMQ:", err);
            setTimeout(() => this.connect(), 5000);
        }
    }

    // Publish a message to an exchange
    async publish(routingKey: string, message: any): Promise<void> {
        if (!this.channel) throw new Error("RabbitMQ not initialized");
        console.log("Message being published with key", routingKey);
        const payload = Buffer.from(JSON.stringify(message));
        this.channel.publish(this.exchange, routingKey, payload, { persistent: true });
    }

    async subscribe(queueName: string, routingKey: string, handler: MessageHandler) {
        if (!this.channel) throw new Error("RabbitMQ not initialized");

        await this.channel.assertQueue(queueName, { durable: true });
        await this.channel.bindQueue(queueName, this.exchange, routingKey);

        this.channel.consume(queueName, async (msg: ConsumeMessage | null) => {
            if (!msg) return;

            try {
                const content = JSON.parse(msg.content.toString());
                await handler(content);
                this.channel!.ack(msg); // message processed successfully
            } catch (err) {
                console.error("Message processing failed:", err);
                this.channel!.nack(msg, false, false); // reject, don't retry
            }
        });
    }


    async close(): Promise<void> {
        try {
            await this.channel?.close();
            await this.connection?.close();
            console.log("RabbitMQ connection closed");
        } catch (err) {
            console.error("Error closing RabbitMQ connection:", err);
        }
    }
}

export const mq = new RabbitMQ(
    process.env.RABBITMQ_URL || "amqp://IUT_Dhongorsho:Dhongorsho123@localhost:5672",
    process.env.RABBITMQ_EXCHANGE || "order_exchange"
);