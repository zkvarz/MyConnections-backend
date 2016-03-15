function define(name, value) {
    Object.defineProperty(exports, name, {
        value:      value,
        enumerable: true
    });
}

define("USERS", "users");
define("PASSWORD", "password");
define("PHONE", "phone");