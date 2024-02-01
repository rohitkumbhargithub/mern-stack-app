const bcrypt = require("bcryptjs/dist/bcrypt");
const User = require("../models/users");
const jwt = require('../utils/jwtToken');


exports.singup = async (req, res) => {
    const {name, email, password, confirmPassword, gender} = req.body;
    try{
            if(password != confirmPassword){
            return res.status(400).json({error: "password not match"});
        }
        
        const user = await User.findOne({email});

        if(user){
            return res.status(400).json({error: "User already exist!"});
        }

        const salt = await bcrypt.genSalt(10);
        const hashPassword = await bcrypt.hash(password, salt);

        const boysProfile = `https://avatar.iran.liara.run/public/boy?username=${name}`;
        const girlsProfile = `https://avatar.iran.liara.run/public/girl?username=${name}`;

        const newUser = new User({
            name,
            email,
            password : hashPassword,
            gender,
            profile: gender === 'male' ? boysProfile : girlsProfile
        })

        if(newUser) {
            await newUser.save();

            jwt(newUser._id, res);

            return res.status(200).json({
                _id: newUser._id,
                name: newUser.name,
                profile: newUser.profile
            })
        }else{
            return res.status(401).json(err.message);
        }
       

    }catch(err){
        console.log('signup ', err);
        return res.status(500).json(err.message);
    }


}


exports.login = async (req, res) => {
    try{
        const {email, password} = req.body;
        const user = await User.findOne({email});
        const isPassword = await bcrypt.compare(password, user?.password || '');

        if(!user || !isPassword){
            return res.status(403).json({err: "Invalid username or password"});
        }

        jwt(user._id, res);

        res.status(200).json({
            _id: user._id,
            email: user.email,
            profile: user.profile
        });

    }catch(err){
        console.log('signup ', err);
        return res.status(500).json({err: "Internal server error"});
    }
}


exports.logout = (req, res) => {
    try{
        res.cookie('jwt', "", {maxAge: 0});
        res.status(200).json({success: "Loggout sucessfully!"});


    }catch(err){
        return res.status(500).json({err: "Internal server error"});
    }
}