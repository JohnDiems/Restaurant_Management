<?php


class Database {
    private $host = "127.0.0.1";
    private $db_name = "restaurant_db";
    private $username = "root";
    private $password = ""; 
    private $charset = "utf8mb4";
    public $conn;

    public function getConnection() {
        $this->conn = null;

        try {
            $dsn = "mysql:host=" . $this->host . ";dbname=" . $this->db_name . ";charset=" . $this->charset;
            
            $options = [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ];

            $this->conn = new PDO($dsn, $this->username, $this->password, $options);
        } catch (PDOException $exception) {
            
            
            header('Content-Type: application/json');
            http_response_code(500);
            echo json_encode([
                "success" => false,
                "message" => "Database connection failed. Please ensure MySQL is running in XAMPP/Laragon and the 'restaurant_db' database is imported.",
                "error" => $exception->getMessage()
            ]);
            exit;
        }

        return $this->conn;
    }
}
