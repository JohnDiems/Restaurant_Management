
CREATE DATABASE IF NOT EXISTS `restaurant_db`;
USE `restaurant_db`;

CREATE TABLE IF NOT EXISTS `customers` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(150) DEFAULT NULL,
    `phone` VARCHAR(20) DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `menu_items` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(150) NOT NULL,
    `description` TEXT,
    `price` DECIMAL(10, 2) NOT NULL,
    `category` VARCHAR(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `orders` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `customer_id` INT NOT NULL,
    `table_number` INT NOT NULL,
    `total_amount` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `status` ENUM('Pending', 'Preparing', 'Served', 'Completed') DEFAULT 'Pending',
    `special_instructions` TEXT DEFAULT NULL,
    `order_date` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `order_items` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `order_id` INT NOT NULL,
    `menu_item_id` INT NOT NULL,
    `quantity` INT NOT NULL,
    `subtotal` DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`menu_item_id`) REFERENCES `menu_items`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `menu_items` (`name`, `description`, `price`, `category`) VALUES
('Gourmet Beef Burger', 'Premium beef patty with cheddar cheese, fresh lettuce, tomatoes, and house special sauce in a toasted brioche bun.', 14.99, 'Mains'),
('Truffle Alfredo Pasta', 'Creamy fettuccine tossed in a rich truffle parmesan sauce, topped with grilled wild mushrooms and parsley.', 12.50, 'Mains'),
('Crispy Caesar Salad', 'Fresh romaine lettuce tossed with classic Caesar dressing, herb garlic croutons, and shaved parmesan cheese.', 8.95, 'Starters'),
('Garlic Butter Shrimp', 'Sautéed tiger prawns in white wine garlic butter sauce, served with toasted sourdough bread slices.', 11.50, 'Starters'),
('Decadent Chocolate Lava Cake', 'Warm chocolate cake with a rich molten chocolate center, served with a scoop of premium vanilla bean ice cream.', 7.50, 'Desserts'),
('Classic New York Cheesecake', 'Rich and creamy baked cheesecake on a buttery graham cracker crust, drizzled with sweet strawberry sauce.', 6.95, 'Desserts'),
('Fresh Mango Smoothie', 'Blended ripe mangoes, Greek yogurt, honey, and crushed ice. Refreshing and naturally sweet.', 4.99, 'Beverages'),
('Iced Caramel Macchiato', 'Freshly brewed espresso with steamed milk, sweet vanilla syrup, and a generous drizzle of dark caramel sauce.', 4.50, 'Beverages');
