# Advanced Banking + AI — Local Runnable (Option B)

See backend, services/ai_advisor, and frontend folders for steps.
📊 CredVest – Intelligent Investment & Portfolio Management System

CredVest is a full-stack financial web application designed to help users manage investment portfolios, track transactions, analyze stock performance, and generate stock price predictions using machine learning.
The system focuses on simplifying financial decision-making through intuitive dashboards and data-driven insights.

📌 Table of Contents

Project Overview

Key Features

System Architecture

Technology Stack

Installation & Setup

Application Workflow

API Structure

Database Design

Machine Learning Module

Security & Authentication

Screenshots

Future Enhancements

1️⃣ Project Overview

CredVest provides a centralized platform where users can:

Manage and monitor investment portfolios

Perform buy and sell operations

Track transaction history

Analyze stock trends using visual charts

Generate predictive stock price insights using machine learning

The application is designed for users with limited market expertise while maintaining accurate financial logic.

2️⃣ Key Features

User registration and authentication

Portfolio overview with real-time value calculations

Buy and sell securities

Transaction history tracking

Stock price prediction module

Interactive charts and dashboards

Secure RESTful backend APIs

3️⃣ System Architecture

CredVest follows a client–server architecture:

Frontend: Web-based user interface for interaction and visualization

Backend: REST API layer handling business logic and data processing

Database: Persistent storage for users, portfolios, and transactions

ML Module: Separate service for stock price prediction

4️⃣ Technology Stack
Frontend

React.js

Vite

Bootstrap / React-Bootstrap

Chart.js

Backend

Node.js

Express.js

MongoDB

Mongoose

REST APIs

Machine Learning

Python

Pandas

NumPy

Scikit-learn

5️⃣ Installation & Setup
Prerequisites

Node.js

MongoDB

Python (for ML module)

Steps
# Clone the repository
git clone https://github.com/your-username/credvest.git

# Backend setup
cd backend
npm install
npm run dev

# Frontend setup
cd frontend
npm install
npm run dev

6️⃣ Application Workflow

User registers or logs in

Dashboard loads portfolio summary

User performs buy or sell transactions

Transactions are stored in the database

Portfolio values update dynamically

User requests stock price prediction

ML model processes historical data

Forecast results are returned and displayed

7️⃣ API Structure

/api/auth – User authentication

/api/portfolio – Portfolio management

/api/transactions – Buy and sell operations

/api/stocks – Stock data retrieval

/api/predict – Stock price prediction

8️⃣ Database Design

The database includes the following collections:

Users

Portfolios

Transactions

Stocks

Each transaction is associated with a specific user and portfolio to maintain consistency and traceability.

9️⃣ Machine Learning Module

The ML module:

Uses historical stock price data

Applies regression-based prediction models

Generates short-term price forecasts

Communicates with the backend via API

🔐 10️⃣ Security & Authentication

JWT-based authentication

Secure password hashing

Protected API routes

Role-based access control

🖼️ 11️⃣ Screenshots




🚀 12️⃣ Future Enhancements

Real-time stock market data integration

Advanced ML models such as LSTM

Mobile application support

Personalized investment recommendations
