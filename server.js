const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");

const app = express();
app.use(cors());
app.use(express.json());

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
});

db.connect((err) => {
  if (err) {
    console.error(err);
  } else {
    console.log("MySQL connected");
  }
});

app.get("/", (req, res) => {
  res.send("MealWise Backend is running");
});

app.get("/api/categories", (req, res) => {
  db.query("SELECT * FROM categories ORDER BY name", (err, result) => {
    if (err) return res.status(500).send(err);
    res.json(result);
  });
});

app.get("/api/recipes", (req, res) => {
  const categoryId = req.query.category_id;

  let sql = "SELECT * FROM recipes";
  const params = [];

  if (categoryId) {
    sql += " WHERE category_id = ?";
    params.push(categoryId);
  }

  db.query(sql, params, (err, result) => {
    if (err) return res.status(500).send(err);
    res.json(result);
  });
});

app.get("/api/weekly-meals", (req, res) => {
  const sql = `
    SELECT wm.id, wm.day_of_week, wm.recipe_id,
           r.name AS recipe_name, r.image_url, r.cook_time
    FROM weekly_meals wm
    JOIN recipes r ON wm.recipe_id = r.id
    ORDER BY FIELD(day_of_week,'Mon','Tue','Wed','Thu','Fri','Sat','Sun')
  `;

  db.query(sql, (err, result) => {
    if (err) return res.status(500).send(err);
    res.json(result);
  });
});

app.post("/api/weekly-meals", (req, res) => {
  const { day_of_week, recipe_id } = req.body;

  if (!day_of_week || !recipe_id) {
    return res.status(400).json({ message: "Missing data" });
  }

  db.query(
    "SELECT id FROM weekly_meals WHERE day_of_week = ?",
    [day_of_week],
    (err, rows) => {
      if (err) return res.status(500).send(err);

      if (rows.length > 0) {
        db.query(
          "UPDATE weekly_meals SET recipe_id = ? WHERE day_of_week = ?",
          [recipe_id, day_of_week],
          (err2, result) => {
            if (err2) return res.status(500).send(err2);
            res.json({ message: "Meal updated", result });
          }
        );
      } else {
        db.query(
          "INSERT INTO weekly_meals (day_of_week, recipe_id) VALUES (?, ?)",
          [day_of_week, recipe_id],
          (err2, result) => {
            if (err2) return res.status(500).send(err2);
            res.json({ message: "Meal added", result });
          }
        );
      }
    }
  );
});

app.delete("/api/weekly-meals/:id", (req, res) => {
  db.query(
    "DELETE FROM weekly_meals WHERE id = ?",
    [req.params.id],
    (err, result) => {
      if (err) return res.status(500).send(err);
      res.json({ message: "Meal removed", result });
    }
  );
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});