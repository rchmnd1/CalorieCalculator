const express = require('express');
const mysql = require('mysql2');
const multer = require('multer');
const app = express();

// Set up multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/images'); // Directory to save uploaded files
    },
    filename: (req, file, cb) => {  
        cb(null, file.originalname)
    }
});

const upload = multer({ storage: storage });

// Create MySQL connection
const connection = mysql.createConnection({
    host: 'sql.freedb.tech',
    user: 'freedb_rchmnd1',
    password: 'Cg7n#KEtds$jDxy',
    database: 'freedb_CalculatorDatabase'
});
connection.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('Connected to MySQL database');
});
// Set up view engine
app.set('view engine', 'ejs');
// enable static files
app.use(express.static('public'));
// enable form processing
app.use(express.urlencoded({
    extended: false
}));
// enable static filesnpm
app.use(express.static('public'));

// Define routes
// Example:
app.get('/viewfood', (req, res) => {
connection.query('SELECT * FROM food INNER JOIN calorie ON calorie.calorie_id = food.calorie_id INNER JOIN macro ON macro.macro_id = food.macro_id; ', (error, results) => {
        if (error) throw error;
        res.render('foodlist', { food:results }); // Render HTML page with data
    });
}); 

app.get('/', (req, res) => {
    // Fetch food data from the database
    const sql = ('SELECT * FROM food INNER JOIN calorie ON calorie.calorie_id = food.calorie_id INNER JOIN macro ON macro.macro_id = food.macro_id;');
    connection.query(sql, (error, results) => {
        if (error) {
            console.error("Error fetching food data:", error);
            res.status(500).send('Error fetching food data');
        } else {
            // Render the form and pass fetched food data to the template
            res.render('index', { foods: results });
        }
    });
});

// ChatGPT was used for this
app.post('/', (req, res) => {
    const foodId = req.body.food_id;
    const amountInGrams = parseFloat(req.body.amount_in_grams);

    const sql = 'SELECT * FROM food INNER JOIN calorie ON calorie.calorie_id = food.calorie_id INNER JOIN macro ON macro.macro_id = food.macro_id WHERE food.food_id = ?';
    connection.query(sql, [foodId], (error, results) => {
        if (error) {
            console.error("Error fetching food data:", error);
            res.status(500).send('Error fetching food data');
        } else {
            const food = results[0];
            const ratio = amountInGrams / food.food_size;
            const totalCalories = ratio * food.calorie_amount;
            const totalProtein = ratio * food.protein_amount;
            const totalCarbs = ratio * food.carb_amount;
            const totalFat = ratio * food.fat_amount;

            res.render('index', {
                foods: results,
                calculationResults: {
                    foodName: food.food_name,
                    amount: amountInGrams,
                    totalCalories: totalCalories.toFixed(2),
                    totalProtein: totalProtein.toFixed(2),
                    totalCarbs: totalCarbs.toFixed(2),
                    totalFat: totalFat.toFixed(2)
                }
            });
        }
    });
});

// ChatGPT was used for this
app.get('/food/:id', (req,res) => {
    // Extract the product ID from the parameters
    const food_id = req.params.id;
    const sql = 'SELECT * FROM food INNER JOIN calorie ON calorie.calorie_id = food.calorie_id INNER JOIN macro ON macro.macro_id = food.macro_id WHERE food.food_id = ?;; ';
    // Fetch data from MySQL based on the product ID
    connection.query( sql, [food_id], (error, results) => {
        if (error) {
            console.error('Database query error:', error.message);
            return res.status(500).send('Error Retrieving product by ID');
        }
        // Check if any product with the given ID was found
        if (results.length > 0) {
            // Render HTML page with the product data
            res.render('food', { food:results[0] });
        } else {
            // If no product with the given ID was found, render a 404 page or handle it accordingly
            res.status(404).send('Product not found');
        }
    });
});

app.get('/addfood', (req, res) =>{
    res.render('addFood');
});

app.post('/food', upload.single('image'), (req, res) => {
    const { food_name, food_size, calorie_amount, protein_amount, carb_amount, fat_amount } = req.body;
    let food_image;
    if (req.file) {
        food_image = req.file.filename; // Save only the filename
    } else {
        food_image = null;
    }

    connection.beginTransaction((err) => {
        if (err) {
            console.error("Error starting transaction:", err);
            return res.status(500).send('Error starting transaction');
        }

        // Insert into calorie table
        const sql1 = 'INSERT INTO calorie (calorie_amount) VALUES (?)';
        connection.query(sql1, [calorie_amount], (error1, results1) => {
            if (error1) {
                return connection.rollback(() => {
                    console.error("Error adding to calorie table:", error1);
                    res.status(500).send('Error adding calorie data');
                });
            }

            const calorieId = results1.insertId;

            // Insert into macro table
            const sql2 = 'INSERT INTO macro (protein_amount, carb_amount, fat_amount) VALUES (?, ?, ?)';
            connection.query(sql2, [protein_amount, carb_amount, fat_amount], (error2, results2) => {
                if (error2) {
                    return connection.rollback(() => {
                        console.error("Error adding to macro table:", error2);
                        res.status(500).send('Error adding macro data');
                    });
                }

                const macroId = results2.insertId;

                // Insert into food table using calorieId and macroId
                const sql3 = 'INSERT INTO food (food_name, food_size, food_image, calorie_id, macro_id) VALUES (?, ?, ?, ?, ?)';
                connection.query(sql3, [food_name, food_size, food_image, calorieId, macroId], (error3, results3) => {
                    if (error3) {
                        return connection.rollback(() => {
                            console.error("Error adding to food table:", error3);
                            res.status(500).send('Error adding food data');
                        });
                    }

                    connection.commit((err) => {
                        if (err) {
                            return connection.rollback(() => {
                                console.error("Error committing transaction:", err);
                                res.status(500).send('Error committing transaction');
                            });
                        }

                        res.redirect('/viewfood');
                    });
                });
            });
        });
    });
});


app.get('/editfood/:id', (req,res) => {
    const food_id = req.params.id;
    const sql = 'SELECT * FROM food INNER JOIN calorie ON calorie.calorie_id = food.calorie_id INNER JOIN macro ON macro.macro_id = food.macro_id WHERE food.food_id = ?';
    // Fetch data from MySQL based on the food ID
    connection.query( sql , [food_id], (error, results) => {
        if (error) {
            console.error('Database query error:', error.message);
            return res.status(500).send('Error retrieving food by ID');
        }
        // Check if any food with the given ID was found
        if (results.length > 0) {
            // Render HTML page with the food data
            res.render('editFood', { food: results[0] });
        } else {
            // If no food with the given ID was found, render a 404 page or handle it accordingly
            res.status(404).send('Food not found');
        }
    });
});

// ChatGPT was used for this
app.post('/editfood/:id', upload.single('image'), (req, res) => {
    const food_id = req.params.id;
    // Extract food data from the request body
    const { food_name, food_size, calorie_amount, protein_amount, carb_amount, fat_amount } = req.body;
    let food_image = req.body.currentImage; // retrieve current image filename
    if (req.file) { // if new image is uploaded
        food_image = req.file.filename; // set image to be new image filename
    }

    connection.beginTransaction((err) => {
        if (err) {
            console.error("Error starting transaction:", err);
            return res.status(500).send('Error starting transaction');
        }

        // Update food table
        const sql = 'UPDATE food SET food_name = ?, food_size = ?, food_image = ? WHERE food_id = ?';
        connection.query(sql, [food_name, food_size, food_image, food_id], (error1, results1) => {
            if (error1) {
                return connection.rollback(() => {
                    console.error("Error updating food table:", error1);
                    res.status(500).send('Error updating food data');
                });
            }

            // Update calorie table using calorie_id from food table
            const sql1 = 'UPDATE calorie SET calorie_amount = ? WHERE calorie_id = (SELECT calorie_id FROM food WHERE food_id = ?)';
            connection.query(sql1, [calorie_amount, food_id], (error2, results2) => {
                if (error2) {
                    return connection.rollback(() => {
                        console.error("Error updating calorie table:", error2);
                        res.status(500).send('Error updating calorie data');
                    });
                }

                // Update macro table using macro_id from food table
                const sql2 = 'UPDATE macro SET protein_amount = ?, carb_amount = ?, fat_amount = ? WHERE macro_id = (SELECT macro_id FROM food WHERE food_id = ?)';
                connection.query(sql2, [protein_amount, carb_amount, fat_amount, food_id], (error3, results3) => {
                    if (error3) {
                        return connection.rollback(() => {
                            console.error("Error updating macro table:", error3);
                            res.status(500).send('Error updating macro data');
                        });
                    }

                    connection.commit((err) => {
                        if (err) {
                            return connection.rollback(() => {
                                console.error("Error committing transaction:", err);
                                res.status(500).send('Error committing transaction');
                            });
                        }

                        res.redirect('/viewfood');
                    });
                });
            });
        });
    });
});



// ChatGPT was used for this
app.get('/deletefood/:id', (req, res) => {
    const food_id = req.params.id;
    
    // Delete from food table first
    const sql = 'DELETE FROM food WHERE food_id = ?;';
    connection.query(sql, [food_id], (error, foodResults) => {
        if (error) {
            console.error("Error deleting food:", error);
            res.status(500).send('Error deleting food');
            return;
        }
        
        // Then delete from calorie table
        const sql1 = 'DELETE FROM calorie WHERE calorie_id = ?;';
        connection.query(sql1, [food_id], (error, calorieResults) => {
            if (error) {
                console.error("Error deleting calorie:", error);
                res.status(500).send('Error deleting calorie');
                return;
            }
            
            // Finally delete from macro table
            const sql2 = 'DELETE FROM macro WHERE macro_id = ?;';
            connection.query(sql2, [food_id], (error, macroResults) => {
                if (error) {
                    console.error("Error deleting macro:", error);
                    res.status(500).send('Error deleting macro');
                } else {
                    // Send a success response
                    res.redirect('/');
                }
            });
        });
    });
});



const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));