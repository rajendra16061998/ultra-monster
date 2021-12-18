const bcrypt = require('bcrypt');
const check = require('../validation/CheckValidation')
const Token = require('../middleware/AuthToken')
const conn = require('../db/config')
const mail = require('../mail/config')
const nodemailer = require('nodemailer');

const nodemail = nodemailer.createTransport({
    host: "smtp.mailtrap.io",
    port: 2525,
    auth: {
        user: "9da5b7ba6396ab",
        pass: "2a152b1fc0ef34"
    }
});

const authSignUp = async (req, res) => {
    let message = null
    let statusCode = 400
    let error = {}
    try {
        const errors = check.resultsValidator(req)
        if (errors.length > 0) {
            return res.status(400).json({
                method: req.method,
                status: res.statusCode,
                error: errors
            })
        } else {

            //hash the paassword
            const encryptedPassword = await bcrypt.hash(req.body.password, 10)
            const formData = {
                username: req.body.username,
                email: 'test@gmail.com',
                password: encryptedPassword,
                referral_code: null
            };

            // Check same username exist or not 
            let sql = `SELECT * FROM users WHERE LOWER(username)= ? limit ?`;
            let user = await conn.query(sql, [formData.username.toLowerCase(), 1]);

            if (user.length > 0) {
                statusCode = 409
                message = `${req.body.username} is already exist`
            } else {
                sql = `INSERT INTO users set ?`;
                user = await conn.query(sql, formData)
                if (user) {
                    statusCode = 201
                    message = `${req.body.username} is create successfully`
                } else {
                    statusCode = 500
                    message = `Something went wrong!`
                    error = `Database error`
                }
            }

            const responseData = {
                status: statusCode,
                message,
                errors: error
            }
            res.send(responseData)
        }



    } catch (error) {
        if (error) throw error;
        res.send(error);
    }
}

const authLogin = async (req, res) => {
    let message = null
    let statusCode = 400
    let error = {}
    let tokens = null
    try {
        const errors = check.resultsValidator(req)
        if (errors.length > 0) {
            return res.status(400).json({
                method: req.method,
                status: res.statusCode,
                error: errors
            })
        } else {
            const formData = {
                username: req.body.username,
                email: '',
                password: req.body.password
            };

            // Check requeted user is exist or not
            let sql = `SELECT * FROM users WHERE LOWER(username)= ? limit ?`;
            let user = await conn.query(sql, [formData.username.toLowerCase(), 1]);
            console.log('user', user)
            if (user.length > 0) {
                const usersRows = (JSON.parse(JSON.stringify(user))[0]);
                const comparison = await bcrypt.compare(formData.password, usersRows.password)
                if (comparison) {
                    const webtoken = await Token.generateAuthToken(usersRows.id)
                    console.log('webtoken', webtoken)
                    statusCode = 200
                    message = 'Login success'
                    tokens = webtoken
                } else {
                    statusCode = 401
                    message = 'Login failed'
                    error.password = "Password does not match!"
                }
            } else {
                statusCode = 404
                message = 'Login failed'
                error.password = "Username does not exist!"
            }
            const responseData = {
                status: statusCode,
                message,
                token: tokens,
                errors: error
            }
            res.send(responseData)
        }
    } catch (error) {
        res.send({ authLogin: error })
    }
}


//Forgot Password 
const sendOtp = async (req, res) => {
    let message = null
    let statusCode = 400
    let error = {}
    try {

        const formData = {
            username: req.body.username,
            email: '',
            password: req.body.password
        };

        // Check requeted user is exist or not
        let sql = `SELECT * FROM users WHERE LOWER(username)= ? limit ?`;
        let user = await conn.query(sql, [formData.username.toLowerCase(), 1]);
        // console.log('user',user)
        if (user.length > 0) {
            const usersRows = (JSON.parse(JSON.stringify(user))[0]);
            var otp = Math.floor(1000 + Math.random() * 9000);
            mailOptions = {
                from: "rajendra@nmsgames.com",
                to: "rajedraakmr@email.com",
                subject: "One time password",
                text: `This Mail is sent with the help of two-step verification<br>
                Please enter the mention otp , ${otp}.`
            }
            let date_ob = new Date();
            const verifyotp_time = date_ob.getTime()
            const updateData = {
                otp,
                verifyotp_time
            }
            let info = await nodemail.sendMail(mailOptions)
            if (info) {
                let sql = "UPDATE users Set ?  WHERE id= ?"
                await conn.query(sql, [updateData, usersRows.id]);
                message = 'Please check your mail otp has been sent'
                statusCode = 200
            } else {
                message = 'Something went wrong'
                statusCode = 500
                error = "Database error"
            }
        } else {
            statusCode = 404
            message = 'Not found'
            error.password = "Username does not exist please enter correct name!"
        }
        const responseData = {
            status: statusCode,
            message,
            errors: error
        }
        res.send(responseData)
    } catch (error) {
        res.send({ error: error })
    }
}

//Forgot Password 
const forgotPassword = async (req, res) => {
    let message = null
    let statusCode = 400
    let error = {}
    try {
        const errors = check.resultsValidator(req)
        if (errors.length > 0) {
            return res.status(400).json({
                method: req.method,
                status: res.statusCode,
                error: errors
            })
        }
        const formData = {
            username: req.body.username,
            otp: req.body.otp
        };

        // Check requeted user is exist or not
        let sql = `SELECT * FROM users WHERE LOWER(username)= ? limit ?`;
        let user = await conn.query(sql, [formData.username.toLowerCase(), 1]);

        if (user.length > 0) {
            const usersRows         = (JSON.parse(JSON.stringify(user))[0]); 
            let date_ob             = new Date();
            const verifyotp_tiime   = date_ob.getTime()
            const expiredTime       = (usersRows.verifyotp_time + 10 * 60000);

            // check otp expire time
            if (verifyotp_tiime<= expiredTime) {
                statusCode      = 200
                message         = "Success"
                const encpass   = await bcrypt.hash(req.body.password, 10)
                const updateData={
                    otp:null,
                    password:encpass
                }
                let sql         = "UPDATE users Set ? WHERE id= ?"
                const user      = await conn.query(sql, [updateData, usersRows.id]); 

                if (user) {
                    statusCode  = 200
                    message     = 'Password updated successfully'
                } else {
                    statusCode  = 200
                    message     = 'Unable to update'
                    error       = "Database error"
                }
            } else {
                statusCode      = 200
                message         = "Otp time has expired"
            }

        } else {
            statusCode      = 404
            message         = 'Not found'
            error.password  = "Username does not exist please enter correct name!"
        }
        const responseData = {
            status: statusCode,
            message,
            errors: error
        }
        res.send(responseData)
    } catch (error) {
        res.send({ message: 'Database error', error: error })
    }
}
module.exports = {
    authLogin,
    authSignUp,
    sendOtp,
    forgotPassword
}