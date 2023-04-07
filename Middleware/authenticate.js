const Authenticate = (req, res, next) => {
    console.log("yes in middleware")
    console.log(req.isAuthenticated());
    if(req.isAuthenticated() === false){
        console.log("not logged in")
        return res.redirect('http://localhost:3000/');
    }
    console.log("yes logged in")
    return next();   
}
module.exports = Authenticate;