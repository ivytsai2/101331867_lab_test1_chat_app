const express = require('express');
const cors = require('cors');
const app = express();
const cookieParser = require("cookie-parser");
const http = require('http').Server(app);
const io = require('socket.io')(http);
const mongoose = require('mongoose');
const PORT = 3000

// Initialization
app.use(cookieParser());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded());

//import models
const UserModel = require('./models/Users')
const GroupMsgModel = require('./models/GroupMsgs')

//database connection
const DB_CONNECTION_STRING = "mongodb+srv://Ivy:SpyFamily0725*@cluster0.4qege3x.mongodb.net/gbc_full_Stack?retryWrites=true&w=majority"
mongoose.connect(DB_CONNECTION_STRING, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log(`Database connection successful`))
.catch((err) => console.log(`Database connection error ${err}`));

//login
app.route('/')
    .get((req, res) => {
        res.clearCookie('username')
        res.sendFile(__dirname + '/views/index.html');
    }).post(async (req, res) => { 
        // validate user input
        if (Object.keys(req.body).length === 0) {
            return res.status(400).send({
                status: false,
                message: "All fields are required"
            });
        }
        try {
            const {username, password} = req.body;
            const user = await UserModel.findOne({username: username});
            if (user && (password === user.password)) {
                res.cookie('username', user.username)
                res.writeHead(301, {Location: `http://localhost:3000/chat`});
                res.end();
            } else {
                res.clearCookie('username')
                res.status(400).send({
                    status: false,
                    message: "Invalid Username or Password"
                });
            } 
        } catch (e) {
            res.status(500).send({
                status: false,
                message: e.message
            });
        }
    })

//sign up
app.route('/signup')
    .get((req, res) => {
        res.sendFile(__dirname + '/views/signup.html');
    }).post(async (req, res) => {
        const {username, firstname, lastname, password, createon} = req.body;
        // validate user input
        if (Object.keys(req.body).length === 0) {
            return res.status(400).send({
                status: false,
                message: "All fields are required"
            });
        }
        try {
            // check if user already exist
            const oldUser = await UserModel.findOne({username: username});
            if (oldUser) {
                return res.status(400).send({
                    status: false,
                    message: "User already exist. Please Login"
                });
            }
            const newUser = new UserModel(req.body)
            await newUser.save();
            console.log("Registered successfully!")
            res.writeHead(301, {Location: '/'});
            res.end();
        } catch (e) {
            const duplicate = e.code === 11000;
            if (!(firstname && lastname && username && password && createon)){
                return res.status(400).send({
                    status: false,
                    message: "All fields are required"
                });
            } else if (duplicate) {
                return res.status(400).send({
                    status: false,
                    message: "This username is already registered"
                });
            }
            res.status(500).send({
                status: false,
                message: e.message
            });
        }
    })

//chat
app.get('/chat', (req, res) => {
    res.sendFile(__dirname + '/views/chat.html')
})

io.on('connection', (socket) => {

    console.log('A user connecting...')

    socket.on('joinRoom', (room) => {
        socket.join(room)
    })

    socket.on('sendMsg', (data) => {
        const msg = {
            msg: data.message,
            name: data.username
        }
        socket.broadcast.to(data.room).emit('msg', msg)
    })

    socket.on('messageRoom', (data) => {
        const message = {
            username: data.username,
            message: data.message
        }
        console.log(`${data.username} sent a message to ${data.room}`)

        // Add message to db
        const dbGroupMsgModel = new GroupMsgModel({
            from_user: data.username,
            room: data.room,
            message: data.message
        })
        dbGroupMsgModel.save()

        socket.broadcast.to(data.room).emit('newMessage', message)
    })

    // disconnect
    socket.on("disconnect", () => {
        console.log("user disconnected...")
    })

})


http.listen(PORT, () => {
   console.log(`Server running at PORT ${PORT}`);
});