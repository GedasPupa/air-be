import express from "express";
import mysql from "mysql";
import cors from 'cors';
import { body, check, validationResult  } from "express-validator";

const port = 3000;
const app = express();

const corsOptions = {
    origin: "http://localhost:4200"
};

const dbConfig = {
    host: "localhost",
    user: "gedaspupa",
    password: "gedaspupa123",
    database: "air",
    multipleStatements: false,
};

const connection = mysql.createConnection({
    host: dbConfig.host,
    user: dbConfig.user,
    password: dbConfig.password,
    database: dbConfig.database,
});

connection.connect((error) => {
    if (error) throw error;
    console.log("Successfully connected to the database.");
});

app.use(cors(corsOptions));
app.use(express.json());

app.get("/test-conn", (req, res) => {
    connection.query("SELECT 1 + 1 AS solution", (err, rows, fields) => {
        if (err) throw err;
        console.log("The solution is: ", rows[0].solution);
        res.status(200).send({ solution: rows[0].solution });
    });
});

// GET all planes:
app.get("/planes", (req, res) => {
    connection.query("SELECT * FROM planes", (err, rows, fields) => {
        if (err) {
            console.log(err.message);
            return res.status(500).send({
                error_code: err.code,
                error_message: err.sqlMessage,
            });
        };
        try {
            console.log('Nice! You got all', rows.length, 'planes!');
        } catch (err) {
            console.log(err.message);
        };
        res.status(200).send(rows);
    });
});

// GET one plane:
app.get("/planes/:id", (req, res) => {
    connection.query(
        "SELECT * FROM planes WHERE id = ?",
        req.params.id,
        (err, rows, fields) => {
            // console.log({...fields});
            if (err) {
                console.log(err.message);
                return res.status(500).send({
                    error_code: err.code,
                    error_message: err.sqlMessage,
                });
            };
            try {
                console.log('You got plane with id: ', rows[0].id);
            } catch (err) {
                console.log(`Plane with id ${req.params.id} not found!`);
            };
            if (rows.length === 0) {
                return res.status(404).send({
                    id: +req.params.id,
                    error_message: 'Record not found'
                });
            }
            res.status(200).send(rows);
        }
    );
});

// DELETE plane:
app.delete("/planes/:id", (req, res) => {
    connection.query(
        "DELETE FROM planes WHERE id = ? ",
        req.params.id,
        (err, rows, field) => {
            if (err) {
                console.log(err.message);
                return res.status(500).send({
                    error_code: err.code,
                    error_message: err.sqlMessage,
                });
            };
            console.log("Deleted rows:", rows.affectedRows);
            if (!rows.affectedRows) return res.status(404).send({
                id: +req.params.id,
                error_message: 'Record not found'
            });
            res.status(204).send({
                id: +req.params.id,
                message: `Record with id ${req.params.id} deleted`
            });
        }
    );
});

// CREATE plane:
app.post(
    "/planes",

    //validation:
    check("from_town").isLength({min: 3, max: 64}).withMessage("'from_town' field must be 3-64 characters long!"),
    check("airline").isLength({min: 3, max: 32}).withMessage("'airline' field must be 3-32 characters long!"),
    check("arrival_time").isISO8601().toDate().withMessage("Not valid date format! Please enter: 'YYYY-MM-DD HH:MM'."),
    check("is_late").custom(value => (value == 0 || value == 1) ? true : false).withMessage("'is_late' field must be 0 or 1!"),
    
    (req, res) => {
        // validation:
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            console.log(errors.errors[0].msg);
            return res.status(400).json(errors);
        }
        // query to DB:
        connection.query(
            "INSERT INTO planes (from_town, airline, arrival_time, is_late) VALUES (?, ?, ?, ?)",
            [
                req.body.from_town,
                req.body.airline,
                req.body.arrival_time,
                req.body.is_late,
            ],
            (err, rows, field) => {
                if (err) {
                    console.log(err.message);
                    return res.status(500).send({
                        error_code: err.code,
                        error_message: err.sqlMessage,
                    });
                };
                console.log("created: ", { id: rows.insertId, ...req.body });
                res.status(201).send({ id: rows.insertId, ...req.body });
            }
        );
    }
);

// UPDATE scooter:
app.put(
    "/planes/:id",
    
    //validation:
    check("from_town").isLength({min: 3, max: 64}).withMessage("'from_town' field must be 3-64 characters long!"),
    check("airline").isLength({min: 3, max: 32}).withMessage("'airline' field must be 3-32 characters long!"),
    check("arrival_time").isISO8601().toDate().withMessage("Not valid date format! Please enter: 'YYYY-MM-DD HH:MM'."),
    check("is_late").custom(value => (value == 0 || value == 1) ? true : false).withMessage("'is_late' field must be 0 or 1!"),
    
    (req, res) => {
        // validation:
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            console.log(errors.errors[0].msg);
            return res.status(400).json(errors);
        }
        // query to DB:
        connection.query(
            "UPDATE planes SET from_town = ?, airline = ?, arrival_time = ?, is_late = ? WHERE id = ?",
            [
                req.body.from_town,
                req.body.airline,
                req.body.arrival_time,
                req.body.is_late,
                req.params.id,
            ],
            (err, rows, field) => {
                if (err) {
                    console.log(err.message);
                    return res.status(500).send({
                        error_code: err.code,
                        error_message: err.sqlMessage,
                    });
                };
                console.log("Updated rows:", rows === undefined ? 0 : rows.affectedRows);
                if (!rows.affectedRows) {
                    console.log(`Record with id ${req.params.id} not found!`);
                    return res.status(404).send({
                        id: +req.params.id,
                        error_message: 'Record not found'
                    });
                }
                res.status(201).send({id: +req.params.id, ...req.body});
            }
        ); 
    }
);

// TOTAL planes:
app.get("/total", (req, res) => {
    connection.query("SELECT count(*) as total_planes FROM planes", (err, rows, fields) => {
        if (err) {
            console.log(err.message);
            return res.status(500).send({
                error_code: err.code,
                error_message: err.sqlMessage,
            });
        };
        console.log("Total planes: ", rows[0].total_planes);
        res.status(200).send({ total_planes: rows[0].total_planes });
    });
});

// TOTAL is_late:
app.get("/is_late", (req, res) => {
    connection.query("SELECT count(is_late) as total_is_late FROM planes WHERE is_late=1", (err, rows, fields) => {
        if (err) {
            console.log(err.message);
            return res.status(500).send({
                error_code: err.code,
                error_message: err.sqlMessage,
            });
        };
        console.log("Total is_late: ", rows[0].total_is_late);
        res.status(200).send({ total_is_late: rows[0].total_is_late });
    });
});

app.listen(port, () =>
    console.log(`Port: ${port}!`)
);
