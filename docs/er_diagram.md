# Entity Relationship (ER) Diagram

This diagram visually represents the core collections and relationships within the MongoDB database for the FoodBridge Platform.

```mermaid
erDiagram
    %% Core Entities
    USER {
        ObjectId _id PK
        String firstName
        String lastName
        String email
        String password
        String phone
        String role "ENUM: donor, volunteer, ngo, admin"
        String status "ENUM: active, inactive, suspended"
        Object address "Street, City, GeoJSON Point"
        Date createdAt
        Date updatedAt
    }

    DONATION {
        ObjectId _id PK
        ObjectId donorId FK "References USER (Donor/NGO)"
        String title
        String description
        String foodType "ENUM: prepared, produce, packaged, baked, other"
        Number quantity
        String condition "ENUM: fresh, frozen, shelf-stable, hot"
        Date expiryDate
        String status "ENUM: pending, matched, claimed, picked_up, completed, cancelled, expired"
        Boolean isPerishable
        Object pickupLocation "GeoJSON Point"
        Date collectionWindowStart
        Date collectionWindowEnd
        Date createdAt
    }

    PICKUP {
        ObjectId _id PK
        ObjectId donationId FK "References DONATION"
        ObjectId volunteerId FK "References USER (Volunteer)"
        ObjectId recipientId FK "References USER (NGO)"
        String status "ENUM: assigned, in_transit, completed, failed, cancelled"
        Date scheduledPickupTime
        Date actualPickupTime
        Date deliveryTime
        String notes
    }

    NOTIFICATION {
        ObjectId _id PK
        ObjectId userId FK "References USER (Recipient)"
        String title
        String message
        String type "ENUM: donation, pickup, system, alert"
        ObjectId relatedId "Reference to Donation/Pickup/Other"
        Boolean isRead
        Date createdAt
    }

    %% Relationships
    USER ||--o{ DONATION : "Creates (As Donor/NGO)"
    USER ||--o{ PICKUP : "Executes (As Volunteer)"
    USER ||--o{ PICKUP : "Receives (As NGO)"
    USER ||--o{ NOTIFICATION : "Receives"
    
    DONATION ||--o| PICKUP : "Assigned To"
```

## Explanation of Key Relationships:

1.  **User to Donation (One-to-Many):** A User with the role `donor` or `ngo` can create multiple `Donation` documents. The `donorId` in the Donation collection points back to the User.
2.  **Donation to Pickup (One-to-One / Zero-to-One):** A `Donation` can have at most one confirmed `Pickup` attached to it at a time. The `donationId` links the Pickup document to the specific food items.
3.  **User to Pickup (One-to-Many):** 
    *   A `volunteer` User can be assigned to multiple `Pickup` events over time (`volunteerId`).
    *   An `ngo` User can be the designated recipient for multiple `Pickup` events over time (`recipientId`).
4.  **User to Notification (One-to-Many):** A User receives multiple notifications. (System generated).
