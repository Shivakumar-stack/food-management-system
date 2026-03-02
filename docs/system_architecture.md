# System Architecture Diagram

This document delineates the high-level architecture of the FoodBridge application, showing the separation of concerns between standard REST traffic and real-time WebSocket connections.

```mermaid
graph TD
    %% Define Styles
    classDef client fill:#e6f2ff,stroke:#3399ff,stroke-width:2px,color:#003366
    classDef server fill:#fff2e6,stroke:#ff9933,stroke-width:2px,color:#663300
    classDef database fill:#e6ffe6,stroke:#33cc33,stroke-width:2px,color:#004d00
    classDef bgproc fill:#f2e6ff,stroke:#9933ff,stroke-width:2px,color:#330066

    subgraph "Client Tier (Frontend)"
        A[Web Browser / Vanilla JS]:::client
    end

    subgraph "Network / Security Layer"
        B[Helmet, HPP, CORS Middleware]:::server
        B2[Express Rate Limiter]:::server
    end

    subgraph "Application Tier (Node.js/Express)"
        C{Routing / API Gateway}:::server
        
        %% Core Routes
        D[Auth / Registration / JWT]:::server
        E[Donations Controller]:::server
        F[Pickups & NGO Claims Controller]:::server
        
        %% Websocket & Background
        G((Socket.IO Server)):::server
        H[[Node-Cron Scheduler]]:::bgproc
        I[[Heavy Services / Geocoding Logic]]:::bgproc
    end

    subgraph "Data Tier"
        J[(MongoDB Database)]:::database
        K>Mongoose ODMs & Transactions]:::database
    end

    %% Client communicating to Server
    A --"HTTP GET/POST /api"--> B
    B --> B2
    B2 --> C
    A --"WSS:// (Live Map)"--> G

    %% Route to Controller logic
    C --> D
    C --> E
    C --> F

    %% Controller using Services
    D --> I
    E --> I
    F --> I

    %% DB Interaction (Controllers & Cron)
    I --> K
    G --"Live Updates"--> K
    H --"Scan & Expire Donations"--> K
    K --> J
```

## Explanation of Layers

### Client Tier
The client is a Vanilla HTML/CSS/JS interface using Tailwind CSS. 
*   **REST Calls:** Communicates via pure HTTP `fetch` requests for standard CRUD operations (Login, Add Donation, Assign Pickup).
*   **WebSockets (`ws:///wss://`):** Maintains a permanent connection with `Socket.io` solely for the **Live Map** page. When a donation changes status, the server broadcasts an event, and the client pin updates immediately without refreshing the page.

### Application Tier (Service Layer Architecture)
*   **Rate Limiting & Security:** All routes pass through an initial funnel that checks for XSS headers (`helmet`), prevents parameter pollution (`hpp`), and caps request frequency via `express-rate-limit`.
*   **Controllers (`/controllers`):** Responsible only for parsing the HTTP request (req/res loops).
*   **Services (`/services`):** This is where heavy business logic happens (e.g., scoring priorities, checking if a volunteer is near the donor).
*   **Background Jobs (`/services/cronService.js`):** A daemon runs on an interval to sweep the database for expired donations without hanging the main Node event loop.

### Data Tier
*   **MongoDB:** NoSQL database handling highly associative unstructured data.
*   **Transactions:** Mongoose ODM executes atomic transactions specifically when assigning Pickups to prevent "double booking" of donations between volunteers.
