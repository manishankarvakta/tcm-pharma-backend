# Aamar Dokan Pharmacy POS API

A comprehensive RESTful API backend for a Pharmacy Point of Sale (POS) system. This API provides all necessary endpoints for managing a pharmacy business, including inventory management, sales, purchases, and reporting.

## 🚀 Features

- **Product Management**
  - Product CRUD operations
  - Category management
  - Brand management
  - Generic management
  - Group management
  - Unit management
  - Price management

- **Inventory Management**
  - Stock tracking
  - Inventory counts
  - Warehouse management
  - Damage management
  - RTV (Return to Vendor) processing
  - TPN (Transfer Product Note) handling

- **Sales & Purchase**
  - Sales management
  - Purchase management
  - GRN (Goods Receipt Note) processing
  - Customer management
  - Supplier management

- **Financial Management**
  - Account management
  - Account head management
  - Financial reporting

- **Additional Features**
  - User management with authentication
  - File management
  - E-commerce integration
  - Comprehensive reporting system
  - Automated backup system
  - Settings management

## 🛠️ Technology Stack

- **Backend Framework:** Node.js with Express.js
- **Database:** MongoDB with Mongoose ODM
- **Authentication:** JWT (JSON Web Tokens)
- **File Storage:** MinIO
- **Task Scheduling:** node-cron
- **Process Management:** PM2

## 📋 Prerequisites

- Node.js (v14 or higher)
- MongoDB
- MinIO Server
- PM2 (for production)

## 🔧 Installation

1. Clone the repository:
```bash
git clone [repository-url]
cd aamardokan-pharma-api
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with the following variables:
```env
PORT=5001
DB_URL=mongodb://localhost:27017/pharmacy
JWT_SECRET=your_jwt_secret
MINIO_ENDPOINT=your_minio_endpoint
MINIO_PORT=your_minio_port
MINIO_ACCESS_KEY=your_minio_access_key
MINIO_SECRET_KEY=your_minio_secret_key
```

4. Start the development server:
```bash
npm run dev
```

For production:
```bash
npm run pm2
```

## 📚 API Documentation

The API documentation is available at `/api/v1/docs` when the server is running.

## 🔄 API Endpoints

### Product Management
- `/api/product` - Product operations
- `/api/category` - Category management
- `/api/brand` - Brand management
- `/api/generic` - Generic management
- `/api/group` - Group management
- `/api/unit` - Unit management
- `/api/price` - Price management

### Inventory Management
- `/api/inventory` - Inventory operations
- `/api/inventoryCount` - Inventory counting
- `/api/warehouse` - Warehouse management
- `/api/damage` - Damage management
- `/api/rtv` - Return to Vendor
- `/api/tpn` - Transfer Product Note

### Sales & Purchase
- `/api/sale` - Sales management
- `/api/purchase` - Purchase management
- `/api/grn` - Goods Receipt Note
- `/api/customer` - Customer management
- `/api/supplier` - Supplier management

### Financial Management
- `/api/account` - Account management
- `/api/accounthead` - Account head management
- `/api/reports` - Financial reports

### System Management
- `/api/user` - User management
- `/api/settings` - System settings
- `/api/fileManager` - File management
- `/api/ecom` - E-commerce integration

## 🔒 Security

- JWT-based authentication
- Password hashing using bcrypt
- CORS enabled
- File upload size limits
- Error handling middleware

## 📦 Backup System

The application includes an automated backup system that can be configured through the settings.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License.

## 👥 Authors

- Aamar Dokan Team

## 🙏 Acknowledgments

- Thanks to all contributors who have helped shape this project
- Special thanks to the open-source community for their invaluable tools and libraries