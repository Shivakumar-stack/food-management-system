# REST API Documentation

The FoodBridge platform uses a stateless RESTful architecture powered by JWT for authentication. Below are key endpoints necessary for client integration.

---

## Authentication `/api/auth`

### 1. Register User
*   **Endpoint:** `POST /api/auth/register`
*   **Description:** Creates a new Donor, Volunteer, NGO, or Admin account.
*   **Payload (JSON):**
    ```json
    {
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com",
      "password": "SecurePassword123!",
      "role": "volunteer",
      "phone": "+1234567890",
      "address": {
        "city": "New York",
        "state": "NY"
      }
    }
    ```
*   **Response (201 Created):**
    ```json
    {
      "success": true,
      "token": "eyJhbGciOiJIUz...",
      "user": { "id": "60d5ecb8b", "role": "volunteer" ... }
    }
    ```

### 2. Login User
*   **Endpoint:** `POST /api/auth/login`
*   **Description:** Authenticates an existing user and returns a JWT. Rate limited to prevent brute-forcing.
*   **Payload (JSON):**
    ```json
    {
      "email": "john.doe@example.com",
      "password": "SecurePassword123!"
    }
    ```
*   **Response (200 OK):**
    Includes the JWT token necessary for the `Authorization: Bearer <token>` header on protected routes.

---

## Donations `/api/donations`

*Note: All endpoints below require an `Authorization: Bearer <jwt-token>` header.*

### 1. List Available Donations
*   **Endpoint:** `GET /api/donations`
*   **Access:** Authenticated Users (Donors see their own; Volunteers/NGOs see all pending).
*   **Query Parameters:** 
    *   `status=pending` (Filter by status)
    *   `lat`, `lng`, `radius` (Geospatial search for nearby drops).
*   **Response (200 OK):** Array of Donation objects containing geo-coordinates, food type, and expiry bounds.

### 2. Create Donation
*   **Endpoint:** `POST /api/donations`
*   **Access:** `Donor`, `NGO`, `Admin`
*   **Payload (JSON):**
    ```json
    {
      "title": "50 Boxed Lunches",
      "foodType": "prepared",
      "quantity": 50,
      "condition": "fresh",
      "expiryDate": "2024-05-20T14:30:00Z",
      "pickupLocation": {
        "coordinates": [-74.006, 40.7128]
      }
    }
    ```

### 3. Claim Donation (Pickup Assignment)
*   **Endpoint:** `POST /api/donations/:id/claim`
*   **Access:** `Volunteer`
*   **Description:** Wraps the assignment of a Donation to a Volunteer in a MongoDB `<Transaction>`. Ensures thread-safety if two volunteers tap "Claim" at the identical millisecond.
*   **Response (200 OK):** Updates the Donation `status` to `matched` and spawns a new `Pickup` record.

---

## Health & Metrics `/api`

### 1. Server Health Check
*   **Endpoint:** `GET /api/health`
*   **Access:** Public
*   **Description:** Returns the live connection status of the MongoDB instance and the Node environment. Used by the Live Dashboard block to ensure backend connectivity.
