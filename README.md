# 🚀 React + ServiceNow Incident Management App

This project is a modern, full-stack Incident Management application built using **React (Frontend)** and **ServiceNow Scripted REST APIs (Backend)**.

It demonstrates how to build a **decoupled, scalable, and enterprise-grade application** on top of ServiceNow, moving beyond traditional Service Portal implementations.

---

## 🔹 Key Features

### 🔐 Authentication
- OAuth 2.0 integration with ServiceNow
- Login using `sys_user` table
- Secure API communication using Bearer tokens

---

### 🔄 Real-Time Updates (Polling)
- Implemented using React Hooks (`useEffect`)
- Periodic data refresh using `setInterval`
- No manual page reload required

---

### 📎 Incident Creation with Attachments
- Create incidents via custom Scripted REST APIs
- Upload multiple file attachments
- Attach files directly to records

---

### 🔔 In-App Notifications
- Real-time UI notifications for user actions
- Improves user awareness and collaboration

---

### 🔍 Search with Debouncing
- Optimized search using debounce technique
- Reduces unnecessary API calls
- Enhances performance and user experience

---

### 📊 Dynamic Filtering & Pagination
- Server-side pagination using `limit` and `offset`
- Encoded queries for flexible filtering
- Page navigation + direct page jump support
- Efficient handling of large datasets (100+ pages)

---

### ✅ Approve / Reject Workflow
- Action-based state transitions
- Server-side validation using GlideRecord
- Controlled business logic for incident updates

---

## 🧠 Architecture
React (Frontend)
↓
Scripted REST APIs (ServiceNow)
↓
GlideRecord (Database Layer)

---

- Fully decoupled architecture
- Reusable APIs
- Scalable and maintainable design

---

## ⚙️ Technologies Used

- React.js
- Axios
- ServiceNow Scripted REST APIs
- GlideRecord / GlideAggregate
- OAuth 2.0
- JavaScript (ES6+)

---

## 🚀 Key Learnings

- Building external applications on top of ServiceNow
- Implementing OAuth authentication
- Handling real-time updates using polling
- Designing scalable pagination and filtering
- Managing attachments via APIs

---

## 🔥 Future Enhancements

- Replace polling with WebSockets / Server-Sent Events
- Implement role-based access control
- Advanced notification system
- UI enhancements with modern component libraries

---

## 💡 Conclusion

This project highlights how ServiceNow can be extended beyond its native UI to build **modern, high-performance applications** using external frameworks like React.

---