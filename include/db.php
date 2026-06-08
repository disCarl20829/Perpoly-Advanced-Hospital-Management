<?php
// ============================================================
// include/db.php — PDO Database Connection Singleton
// ============================================================

require_once __DIR__ . '/../config.php';

class DB
{
    private static ?PDO $instance = null;

    public static function conn(): PDO
    {
        if (self::$instance === null) {
            $dsn = 'mysql:host=' . DB_HOST
                . ';dbname=' . DB_NAME
                . ';charset=' . DB_CHAR;

            try {
                self::$instance = new PDO($dsn, DB_USER, DB_PASS, [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false,
                ]);
            } catch (PDOException $e) {
                // In prototype: show error. In production: log & show generic message.
                error_log('[DB] Connection failed: ' . $e->getMessage());
                http_response_code(503);
                die('Database connection failed. Please try again later.');
            }
        }
        return self::$instance;
    }

    // Convenience: prepare + execute + return statement
    public static function run(string $sql, array $params = []): PDOStatement
    {
        $stmt = self::conn()->prepare($sql);
        $stmt->execute($params);
        return $stmt;
    }

    // Fetch all rows
    public static function all(string $sql, array $params = []): array
    {
        return self::run($sql, $params)->fetchAll();
    }

    // Fetch single row
    public static function one(string $sql, array $params = []): array|false
    {
        return self::run($sql, $params)->fetch();
    }

    // Insert and return last insert ID
    public static function insert(string $sql, array $params = []): string
    {
        self::run($sql, $params);
        return self::conn()->lastInsertId();
    }
}