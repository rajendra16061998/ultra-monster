const express = require('express')
const cors    = require('cors');
const bodyParser = require('body-parser');
const fileupload = require('express-fileupload')
const app = express() 
require('dotenv').config()

const port = process.env.PORT || 5000; 
//db import
require('./db/config')

app.use(express.static('public'))
app.use(cors())
app.use(bodyParser.json())
app.use(fileupload())
// Import routes
const AuthRoute = require('./routes/AuthRoute')
const UserRoute = require('./routes/UserRoute')

 
app.use('/auth',AuthRoute)
app.use('/users',UserRoute)

// Default route direction!!
app.get('/',(req,res)=>{
    res.send('default routes!')
})

app.listen(port,()=>{
 console.log( ` server running at http://localhost:${port}`)
});

