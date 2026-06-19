import { RabbitMQ } from "../lib/rabbitmq.js";


export const mq = new RabbitMQ(
    process.env.RABBITMQ_URL || "amqp://IUT_Dhongorsho:Dhongorsho123@localhost:5672",
    process.env.RABBITMQ_EXCHANGE || "order_exchange"
);