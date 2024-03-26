
const mysql = require('mysql');

const dbconnection = () => {
   
    const con = mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: 'Un0h001m!',
        database: 'user_db'
    })

    con.connect((err)=>{
        if(err) {
            console.log(err)
        } else {
            console.log(con.config.database," Database is connected");
        }
    })
  
    return con;
}

module.exports = dbconnection;