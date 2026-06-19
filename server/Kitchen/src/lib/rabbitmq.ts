// src/lib/rabbitmq.ts
import amqp, { Channel, ConsumeMessage, Connection, ChannelModel } from "amqplib";

type MessageHandler = (data: any) => Promise<void>;

export class RabbitMQ {
    private connection: ChannelModel | null = null;
    private channel: Channel | null = null;
    private readonly url: string;
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

        const dlxExchange = "dlx_exchange";
        const dlqQueue = queueName + "_dlq";
        const dlqRoutingKey = queueName + "_routing_dlq";

        // Assert DLX and DLQ
        await this.channel.assertExchange(dlxExchange, "direct", { durable: true });
        await this.channel.assertQueue(dlqQueue, { durable: true });
        await this.channel.bindQueue(dlqQueue, dlxExchange, dlqRoutingKey);

        // Assert primary queue pointing to DLX
        await this.channel.assertQueue(queueName, { 
            durable: true,
            arguments: {
                "x-dead-letter-exchange": dlxExchange,
                "x-dead-letter-routing-key": dlqRoutingKey
            }
        });
        await this.channel.bindQueue(queueName, this.exchange, routingKey);

        this.channel.consume(queueName, async (msg: ConsumeMessage | null) => {
            if (!msg) return;

            const headers = msg.properties.headers || {};
            const retries = headers["x-retries"] || 0;
            let content: any;
            
            try {
                content = JSON.parse(msg.content.toString());
            } catch (parseErr) {
                console.error("Failed to parse message content:", parseErr);
                this.channel!.ack(msg); // Drop unparseable message
                return;
            }

            try {
                await handler(content);
                this.channel!.ack(msg); // message processed successfully
            } catch (err) {
                console.error(`Message processing failed on queue ${queueName}:`, err);
                
                if (retries < 3) {
                    console.warn(`[Retry ${retries + 1}/3] Scheduled for queue ${queueName} in 2s`);
                    this.channel!.ack(msg); // Ack original message to prevent it from clogging the queue

                    setTimeout(async () => {
                        try {
                            if (this.channel) {
                                this.channel.publish(this.exchange, routingKey, Buffer.from(JSON.stringify(content)), {
                                    persistent: true,
                                    headers: { ...headers, "x-retries": retries + 1 }
                                });
                            }
                        } catch (publishErr) {
                            console.error("Failed to publish retry message:", publishErr);
                        }
                    }, 2000);
                } else {
                    console.error(`Max retries reached for message. Routing natively to DLQ: ${dlqQueue}`);
                    this.channel!.nack(msg, false, false); // Nack with requeue=false routes it to DLQ
                }
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