export const checkOnlyOwner = (req,res,next) => {
    if(req.user.role !== "Owner")
        return res.status(403).json({error: "not allowed!"})
    next()
}