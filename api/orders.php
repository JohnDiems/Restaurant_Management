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
        $query = "SELECT 
                    o.id AS order_id, o.table_number, o.total_amount, o.status, o.special_instructions, o.order_date,
                    c.id AS customer_id, c.name AS customer_name, c.email AS customer_email, c.phone AS customer_phone,
                    oi.id AS item_id, oi.menu_item_id, oi.quantity, oi.subtotal,
                    mi.name AS menu_item_name, mi.price AS menu_item_price
                  FROM orders o
                  JOIN customers c ON o.customer_id = c.id
                  LEFT JOIN order_items oi ON o.id = oi.order_id
                  LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id";
        
        if ($id !== null) {
            $query .= " WHERE o.id = :id";
        }
        
        $query .= " ORDER BY o.order_date DESC";
        
        $stmt = $db->prepare($query);
        
        if ($id !== null) {
            $stmt->bindParam(':id', $id, PDO::PARAM_INT);
        }
        
        $stmt->execute();
        
        $orders = [];
        while ($row = $stmt->fetch()) {
            $order_id = $row['order_id'];
            if (!isset($orders[$order_id])) {
                $orders[$order_id] = [
                    "id" => $order_id,
                    "table_number" => intval($row['table_number']),
                    "total_amount" => floatval($row['total_amount']),
                    "status" => $row['status'],
                    "special_instructions" => $row['special_instructions'],
                    "order_date" => $row['order_date'],
                    "customer" => [
                        "id" => intval($row['customer_id']),
                        "name" => $row['customer_name'],
                        "email" => $row['customer_email'],
                        "phone" => $row['customer_phone']
                    ],
                    "items" => []
                ];
            }
            
            if ($row['item_id'] !== null) {
                $orders[$order_id]['items'][] = [
                    "id" => intval($row['item_id']),
                    "menu_item_id" => intval($row['menu_item_id']),
                    "name" => $row['menu_item_name'],
                    "price" => floatval($row['menu_item_price']),
                    "quantity" => intval($row['quantity']),
                    "subtotal" => floatval($row['subtotal'])
                ];
            }
        }
        
        if ($id !== null) {
            if (empty($orders)) {
                http_response_code(404);
                echo json_encode(["success" => false, "message" => "Order not found."]);
            } else {
                http_response_code(200);
                echo json_encode(["success" => true, "data" => array_values($orders)[0]]);
            }
        } else {
            http_response_code(200);
            echo json_encode(["success" => true, "data" => array_values($orders)]);
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

    
    $customer_name = isset($data['customer_name']) ? trim($data['customer_name']) : '';
    $customer_phone = (isset($data['customer_phone']) && !empty(trim($data['customer_phone']))) ? trim($data['customer_phone']) : 'N/A';
    $customer_email = (isset($data['customer_email']) && !empty(trim($data['customer_email']))) 
        ? trim($data['customer_email']) 
        : strtolower(preg_replace('/[^a-zA-Z0-9]/', '', $customer_name)) . '_' . time() . '@guest.com';
    $table_number = isset($data['table_number']) ? intval($data['table_number']) : 0;
    $special_instructions = isset($data['special_instructions']) ? trim($data['special_instructions']) : null;
    $items = isset($data['items']) ? $data['items'] : [];

    if (empty($customer_name)) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Customer name is required."]);
        return;
    }

    if ($table_number <= 0) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "A valid table number is required."]);
        return;
    }

    if (empty($items) || !is_array($items)) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "At least one menu item must be ordered."]);
        return;
    }

    try {
        $db->beginTransaction();

        $cust_query = "SELECT id FROM customers WHERE name = :name ORDER BY id DESC LIMIT 1";
        $cust_stmt = $db->prepare($cust_query);
        $cust_stmt->execute([':name' => $customer_name]);
        $customer = $cust_stmt->fetch();

        if ($customer) {
            $customer_id = intval($customer['id']);
        } else {
            $insert_cust = "INSERT INTO customers (name, email, phone) VALUES (:name, :email, :phone)";
            $insert_cust_stmt = $db->prepare($insert_cust);
            $insert_cust_stmt->execute([
                ':name' => $customer_name,
                ':email' => $customer_email,
                ':phone' => $customer_phone
            ]);
            $customer_id = intval($db->lastInsertId());
        }

        
        $total_amount = 0.00;
        $validated_items = [];

        foreach ($items as $item) {
            $menu_item_id = isset($item['menu_item_id']) ? intval($item['menu_item_id']) : 0;
            $quantity = isset($item['quantity']) ? intval($item['quantity']) : 0;

            if ($menu_item_id <= 0 || $quantity <= 0) {
                throw new Exception("Invalid menu item selection or quantity.");
            }

            
            $menu_query = "SELECT price FROM menu_items WHERE id = :id";
            $menu_stmt = $db->prepare($menu_query);
            $menu_stmt->execute([':id' => $menu_item_id]);
            $menu_item = $menu_stmt->fetch();

            if (!$menu_item) {
                throw new Exception("Menu item with ID {$menu_item_id} does not exist.");
            }

            $price = floatval($menu_item['price']);
            $subtotal = $price * $quantity;
            $total_amount += $subtotal;

            $validated_items[] = [
                "menu_item_id" => $menu_item_id,
                "quantity" => $quantity,
                "subtotal" => $subtotal
            ];
        }

        
        $order_query = "INSERT INTO orders (customer_id, table_number, total_amount, status, special_instructions) 
                        VALUES (:customer_id, :table_number, :total_amount, 'Pending', :special_instructions)";
        $order_stmt = $db->prepare($order_query);
        $order_stmt->execute([
            ':customer_id' => $customer_id,
            ':table_number' => $table_number,
            ':total_amount' => $total_amount,
            ':special_instructions' => $special_instructions
        ]);
        $order_id = intval($db->lastInsertId());

        
        $item_query = "INSERT INTO order_items (order_id, menu_item_id, quantity, subtotal) 
                       VALUES (:order_id, :menu_item_id, :quantity, :subtotal)";
        $item_stmt = $db->prepare($item_query);

        foreach ($validated_items as $v_item) {
            $item_stmt->execute([
                ':order_id' => $order_id,
                ':menu_item_id' => $v_item['menu_item_id'],
                ':quantity' => $v_item['quantity'],
                ':subtotal' => $v_item['subtotal']
            ]);
        }

        $db->commit();

        http_response_code(201);
        echo json_encode([
            "success" => true,
            "message" => "Order placed successfully.",
            "data" => [
                "order_id" => $order_id,
                "customer_id" => $customer_id,
                "total_amount" => $total_amount,
                "status" => "Pending"
            ]
        ]);

    } catch (Exception $e) {
        $db->rollBack();
        http_response_code(400);
        echo json_encode([
            "success" => false,
            "message" => "Failed to place order: " . $e->getMessage()
        ]);
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
    $status = isset($data['status']) ? trim($data['status']) : '';

    if ($id <= 0 || empty($status)) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Order ID and status are required."]);
        return;
    }

    $allowed_statuses = ['Pending', 'Preparing', 'Served', 'Completed'];
    if (!in_array($status, $allowed_statuses)) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Invalid status value."]);
        return;
    }

    try {
        
        $check_query = "SELECT id FROM orders WHERE id = :id";
        $check_stmt = $db->prepare($check_query);
        $check_stmt->execute([':id' => $id]);
        
        if (!$check_stmt->fetch()) {
            http_response_code(404);
            echo json_encode(["success" => false, "message" => "Order not found."]);
            return;
        }

        
        $update_query = "UPDATE orders SET status = :status WHERE id = :id";
        $update_stmt = $db->prepare($update_query);
        $update_stmt->execute([
            ':status' => $status,
            ':id' => $id
        ]);

        http_response_code(200);
        echo json_encode([
            "success" => true,
            "message" => "Order status updated to '{$status}' successfully.",
            "data" => [
                "id" => $id,
                "status" => $status
            ]
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Database update failed.", "error" => $e->getMessage()]);
    }
}


function handleDelete($db) {
    $id = isset($_GET['id']) ? intval($_GET['id']) : 0;

    if ($id <= 0) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Valid Order ID is required in query parameter."]);
        return;
    }

    try {
        
        $check_query = "SELECT id FROM orders WHERE id = :id";
        $check_stmt = $db->prepare($check_query);
        $check_stmt->execute([':id' => $id]);
        
        if (!$check_stmt->fetch()) {
            http_response_code(404);
            echo json_encode(["success" => false, "message" => "Order not found."]);
            return;
        }

        
        $delete_query = "DELETE FROM orders WHERE id = :id";
        $delete_stmt = $db->prepare($delete_query);
        $delete_stmt->execute([':id' => $id]);

        http_response_code(200);
        echo json_encode([
            "success" => true,
            "message" => "Order cancelled/deleted successfully.",
            "data" => [
                "id" => $id
            ]
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Database deletion failed.", "error" => $e->getMessage()]);
    }
}
