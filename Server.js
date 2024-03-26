
const express = require('express');
const path = require('path');
const util = require("util");
const crypto = require('crypto');
const md5 = require('md5');


const dbconnection = require('./db');
const { Console, time } = require('console');

const app = express();

const Port = 8102;
let con;
app.listen(Port, (err) => {
    if (err) throw err;
    con = dbconnection();
    console.log("Server is Listening on Port : " + Port);
})


app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'views/pages')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/register', async (req, res) => {
    res.render('pages/register', { fresh: true });
})

app.get('/login', (req, res) => {

    res.render('pages/login', {fresh: true});
})

app.post('/registeruser', async (req, res) => {

    const { email, first_name, last_name, city, pwd } = req.body;
    const checkIfUserExist = await checkExistance(email);

    const salt = generateSalt();
    const activation_token = generateToken();
    const encrypted_pwd = md5(pwd + salt);

    let result;
    if (!checkIfUserExist) {
        result = await createNewUser({ email, salt, first_name, last_name, city, encrypted_pwd, activation_token });
        if (result) {

            // const res_obj = {
            //     status: true,
            //     token: activation_token
            // }async 
            // return res.json({res_obj});
            res.render('pages/activation', { status: true, email, token: activation_token });
        }
    }
    else {
        // const res_obj = {
        //     status: false,
        //     message: 'User Already Exist'
        // }
        res.render('pages/register', { fresh: false });
    }


})


app.get('/activate', async (req, res) => {

    const mail = req.query.id;
    const token = req.query.token;

    const promisedQuery = util.promisify(con.query).bind(con);

    const user = await getUser(mail);
    const validatedToken = await validateToken(user[0], token)
    console.log('abc',validatedToken);
    if (validatedToken == 1) {

        const sqlquery = `update users set account_status = true where email = '${mail}'`
        const result = await promisedQuery(sqlquery);
        // res.json({
        //     userFound: true,
        //     account_status: true
        // })
     
        res.render('pages/success', { status: 'Your Account is Activated' });
    }else if(validatedToken == 0){
       
        res.render('pages/success', { status: 'Your Token is Expired' });
    }
    else if (validatedToken == -1){
      
        res.render('pages/success', { status: 'invalid token' });
    }



})

app.get('/fgtpwd',async (req, res) => {

    const email = req.query.id;
    const activation_token = generateToken();

    const checkIfUserExist = await checkExistance(email);
    if(checkIfUserExist){
        const activation_token = generateToken();
        const promisedQuery = util.promisify(con.query).bind(con);
        const current_time = new Date();
        console.log(current_time);
        const sqlquery = `update users set activation_token = '${activation_token}', regi_time = CURRENT_TIMESTAMP()  where email = '${email}'`;
        const result = await promisedQuery(sqlquery);
        res.render('pages/fogpwd', { status: true, email, token: activation_token });
    }
    else{
        res.render('pages/login',{ fresh: false, message: 'User does Not exist.'});
    }

})

app.get('/setpwd', (req,res) => {
    const token = req.query.token;
    const email = req.query.id;

    res.render('pages/setpwd', {token, email});
})

app.post('/changepwd',async (req, res) => {
    const email = req.body.email;
    const token = req.body.token;
    const pwd = req.body.pwd;
    const promisedQuery = util.promisify(con.query).bind(con);

    const user = await getUser(email);
    const validatedToken = await validateToken(user[0], token);
    const salt = generateSalt();
    const encrypted_pwd = md5(pwd + salt);

    if (validatedToken == 1) {

        const sqlquery = `update users set pwd = '${encrypted_pwd}', salt = '${salt}' where email = '${email}'`
        const result = await promisedQuery(sqlquery);
        // res.json({
        //     userFound: true,
        //     account_status: true
        // })
     
        res.render('pages/success', { status: 'Your Password has been Changed' });
    }else {     
        res.render('pages/success', { status: 'Something went wrong, Please retry "Forget Password"' });
    }
})

// app.post('/checkemail',async (req, res) => {
//     const mail = req.body.email;
//     const checkIfUserExist =  await checkExistance(mail);

//     if(checkIfUserExist){
//         const user = await getUser(mail);
//         if(user[0].account_status){
//             res.json({
//                 userFound: true,
//                 account_status: true
//             })
//         }
//         else{
//             res.json({
//                 userFound: true,
//                 account_status: false
//             })
//         }
//     }
//     else{
//         res.json({
//             userFound: false,
//         })
//     }
// })

// app.post('/checktoken',async (req, res) => {
//     const mail = req.body.email;
//     const token = req.body.token;
//     const promisedQuery = util.promisify(con.query).bind(con);

//     const user = await getUser(mail);
//     console.log('a token',user);
//     console.log('u token',token);
//     if(user[0].activation_token === token){
//         console.log('i am in')
//         const sqlquery = `update users set account_status = true where email = '${mail}'`
//         const result = await promisedQuery(sqlquery);
//         res.json({
//             userFound: true,
//             account_status: true
//         })
//     }else{
//         console.log('i am in else')
//         res.json({
//             userFound: true,
//             account_status: false
//         })
//     }



// })

app.post('/signin', async (req, res) => {

    const promisedQuery = util.promisify(con.query).bind(con);
    const { email, pwd } = req.body;
    const checkIfUserExist = await checkExistance(email);

    if(checkIfUserExist) {
        const user = await getUser(email);
        console.log(user)
        if (user[0].account_status == 1) {
            console.log('pwd sdfsd data', pwd)
            const passwordstr = pwd + user[0].salt;
            console.log('pwd data', user[0].pwd)
            console.log('pwd in', md5(passwordstr))
            if (user[0].pwd == md5(passwordstr)) {
                res.render('pages/success',{status: 'Login Successfully.'});
            }
            else {
                res.render('pages/login',{fresh: false, message: 'Invalid Credentials.'});
            }

        }
        else {
            res.render('pages/login',{fresh: false, message: 'Your Account is Not Activated, Please Activate first to sign in.'});
        }

    }
    else {
        res.render('pages/login',{ fresh: false, message: 'User does Not exist.'});
    }


})


app.get('/success', (req, res) => {

    res.render('pages/success');
})


// ==========  Creating New User ===============================//

async function createNewUser(data) {

    const promisedQuery = util.promisify(con.query).bind(con);

    const { email, salt, first_name, last_name, city, encrypted_pwd, activation_token } = data;


    const sqlquery = `insert into users (email, pwd, salt, first_name, last_name, city, account_status, activation_token) values (?,?,?,?,?,?,?,?);`
    const result = await promisedQuery(sqlquery, [email, encrypted_pwd, salt, first_name, last_name, city, false, activation_token]);
    if (result.affectedRows == 1)
        return true;
    else
        return false;


}



function generateSalt() {
    return crypto.randomBytes(2).toString('hex');
}

function generateToken() {
    return crypto.randomBytes(8).toString('hex');
}

async function getUser(email) {
    const promisedQuery = util.promisify(con.query).bind(con);
    const sqlquery = `select * from user_db.users where email = '${email}';`;
    const result = await promisedQuery(sqlquery);

    return result;
}

async function checkExistance(email) {

    const promisedQuery = util.promisify(con.query).bind(con);
    const sqlquery = `select count(email) as count from user_db.users where email = '${email}'; `
    let flag = true;

    const result = await promisedQuery(sqlquery);
    console.log(result[0])
    if (result[0].count == 0) {
        flag = false;
        console.log(flag)
    }
    console.log(flag)
    return flag;

}

function validateToken(user, token) {

    const regTime = user.regi_time;
    const usrToken = user.activation_token;
    const currentTime = new Date();
    const validTimeDiff = 2000;
    const timeDiff = (currentTime.getTime() - regTime.getTime()) / 1000;
    if (timeDiff > validTimeDiff && token == usrToken) {
       
        return 0;
    }
    else if (timeDiff <= validTimeDiff && token == usrToken) {
      
        return 1;
    }
    else {
     
        return -1;
    }

}