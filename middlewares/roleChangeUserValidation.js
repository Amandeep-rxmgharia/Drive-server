export const roleChangeUserValidation = async(req,res,next) => {
    const {role} = req.body
    const priorityOrder = { Owner: 4, Admin: 3, Manager: 2, User: 1 };
    if(req.user._id.toString() == req.params.userId)
      return res.status(403).json({ error: "can't change yourself!" });
    if(priorityOrder[role] > priorityOrder[req.user.role]) 
        return res.status(403).json({ error: "not allowed" });
    next()
}