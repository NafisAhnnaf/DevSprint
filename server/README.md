


# Microservice API Routes Reference

---

## Identity Service

### Authentication
- **POST** `/api/identity/auth/register` — Register a new user. Body {email, password, confirmPassword, studentId, name}
- **POST** `/api/identity/auth/login` — Login user Body {studentId, password}
- **GET** `/api/identity/auth/` — Check service status

### User
- **GET** `/api/identity/user/:id` — Get user details by user ID

### Admin
- **POST** `/api/identity/admin/add/:userId` — Add a new admin (guard to be applied) (Just kidding ;) 
- **DELETE** `/api/identity/admin/:id` — Delete admin by admin ID (requires adminGuard)
- **GET** `/api/identity/admin/:userId` — Get admin details by user ID
- **GET** `/api/identity/admin/` — Get all admins (requires adminGuard)
- **GET** `/api/identity/admin/me` — Get currently authenticated admin's access info (requires adminGuard)

---

## Inventory Service

### Orders
- **POST** `/api/inventory/order/` — Create a new order {userId: req.headers.user_id (handled automatically)}
- **GET** `/api/inventory/order/:id` — Get order details by order ID
- **DELETE** `/api/inventory/order/:id` — Delete order by order ID

### Stock
- **GET** `/api/inventory/stock/` — Get stock quantities (all stocks)
- **GET** `/api/inventory/stock/:id` — Get stock details by stock ID
- **GET** `/api/inventory/stock/date/:forDate` — Get stocks for a specific date (`YYYY-MM-DD`)
- **POST** `/api/inventory/stock/` — Create stock entries Body{quantity:number, forDate:YYYY-MM-DD}
- **DELETE** `/api/inventory/stock/:id` — Delete stock by ID
- **DELETE** `/api/inventory/stock/date:forDate` — Delete stock by date

---

## Notification Service

### Orders Stream
- **GET** `/api/notification/orders` — Register SSE stream for live order notifications