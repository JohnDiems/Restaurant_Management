<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/config/database.php';

try {
    $database = new Database();
    $db = $database->getConnection();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Database connection error.", "error" => $e->getMessage()]);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        handleGet($db);
        break;
    case 'POST':
        handlePost($db);
        break;
    case 'PUT':
        handlePut($db);
        break;
    case 'DELETE':
        handleDelete($db);
        break;
    default:
        http_response_code(405);
        echo json_encode(["success" => false, "message" => "Method Not Allowed"]);
        break;
}

function handleGet($db) {
    $id = isset($_GET['id']) ? intval($_GET['id']) : null;

    try {
        if ($id !== null) {
            $query = "SELECT id, name, description, price, category FROM menu_items WHERE id = :id";
            $stmt = $db->prepare($query);
            $stmt->bindParam(':id', $id, PDO::PARAM_INT);
            $stmt->execute();
            $item = $stmt->fetch();

            if ($item) {
                http_response_code(200);
                echo json_encode(["success" => true, "data" => $item]);
            } else {
                http_response_code(404);
                echo json_encode(["success" => false, "message" => "Menu item not found."]);
            }
        } else {
            $query = "SELECT id, name, description, price, category FROM menu_items ORDER BY category, name";
            $stmt = $db->prepare($query);
            $stmt->execute();
            $items = $stmt->fetchAll();

            http_response_code(200);
            echo json_encode(["success" => true, "data" => $items]);
        }
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Database query failed.", "error" => $e->getMessage()]);
    }
}

function handlePost($db) {
    $data = json_decode(file_get_contents("php://input"), true);

    if (!$data) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Invalid JSON payload."]);
        return;
    }

    $name = isset($data['name']) ? trim($data['name']) : '';
    $category = isset($data['category']) ? trim($data['category']) : '';
    $price = isset($data['price']) ? floatval($data['price']) : 0.00;
    $description = isset($data['description']) ? trim($data['description']) : null;

    if (empty($name) || empty($category) || $price <= 0) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Name, category, and a positive price are required."]);
        return;
    }

    $allowed_categories = ['Starters', 'Mains', 'Desserts', 'Beverages'];
    if (!in_array($category, $allowed_categories)) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Invalid category. Must be one of: Starters, Mains, Desserts, Beverages."]);
        return;
    }

    try {
        $query = "INSERT INTO menu_items (name, description, price, category) VALUES (:name, :description, :price, :category)";
        $stmt = $db->prepare($query);
        $stmt->execute([
            ':name' => $name,
            ':description' => $description,
            ':price' => $price,
            ':category' => $category
        ]);
        $new_id = intval($db->lastInsertId());

        http_response_code(201);
        echo json_encode([
            "success" => true,
            "message" => "Menu item created successfully.",
            "data" => [
                "id" => $new_id,
                "name" => $name,
                "category" => $category,
                "price" => $price,
                "description" => $description
            ]
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Failed to create menu item.", "error" => $e->getMessage()]);
    }
}

function handlePut($db) {
    $data = json_decode(file_get_contents("php://input"), true);

    if (!$data) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Invalid JSON payload."]);
        return;
    }

    $id = isset($data['id']) ? intval($data['id']) : 0;
    $name = isset($data['name']) ? trim($data['name']) : '';
    $category = isset($data['category']) ? trim($data['category']) : '';
    $price = isset($data['price']) ? floatval($data['price']) : 0.00;
    $description = isset($data['description']) ? trim($data['description']) : null;

    if ($id <= 0 || empty($name) || empty($category) || $price <= 0) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "ID, name, category, and a positive price are required."]);
        return;
    }

    $allowed_categories = ['Starters', 'Mains', 'Desserts', 'Beverages'];
    if (!in_array($category, $allowed_categories)) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Invalid category. Must be one of: Starters, Mains, Desserts, Beverages."]);
        return;
    }

    try {
        $check_query = "SELECT id FROM menu_items WHERE id = :id";
        $check_stmt = $db->prepare($check_query);
        $check_stmt->execute([':id' => $id]);
        if (!$check_stmt->fetch()) {
            http_response_code(404);
            echo json_encode(["success" => false, "message" => "Menu item not found."]);
            return;
        }

        $query = "UPDATE menu_items SET name = :name, description = :description, price = :price, category = :category WHERE id = :id";
        $stmt = $db->prepare($query);
        $stmt->execute([
            ':name' => $name,
            ':description' => $description,
            ':price' => $price,
            ':category' => $category,
            ':id' => $id
        ]);

        http_response_code(200);
        echo json_encode([
            "success" => true,
            "message" => "Menu item updated successfully.",
            "data" => [
                "id" => $id,
                "name" => $name,
                "category" => $category,
                "price" => $price,
                "description" => $description
            ]
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Failed to update menu item.", "error" => $e->getMessage()]);
    }
}

function handleDelete($db) {
    $id = isset($_GET['id']) ? intval($_GET['id']) : 0;

    if ($id <= 0) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Valid Menu Item ID is required in query parameter."]);
        return;
    }

    try {
        $check_query = "SELECT id FROM menu_items WHERE id = :id";
        $check_stmt = $db->prepare($check_query);
        $check_stmt->execute([':id' => $id]);
        if (!$check_stmt->fetch()) {
            http_response_code(404);
            echo json_encode(["success" => false, "message" => "Menu item not found."]);
            return;
        }

        $query = "DELETE FROM menu_items WHERE id = :id";
        $stmt = $db->prepare($query);
        $stmt->execute([':id' => $id]);

        http_response_code(200);
        echo json_encode([
            "success" => true,
            "message" => "Menu item deleted successfully.",
            "data" => ["id" => $id]
        ]);
    } catch (PDOException $e) {
        if ($e->getCode() == '23000' || (isset($e->errorInfo[1]) && $e->errorInfo[1] == 1451)) {
            http_response_code(409);
            echo json_encode([
                "success" => false,
                "message" => "This menu item cannot be deleted because it is linked to past order records. You can modify its details instead."
            ]);
        } else {
            http_response_code(500);
            echo json_encode(["success" => false, "message" => "Failed to delete menu item.", "error" => $e->getMessage()]);
        }
    }
}
