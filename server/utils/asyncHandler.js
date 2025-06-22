//const asyncHandler = () =>{}


const asyncHandler = (requestHandler) =>{
    return (req, res ,next) => {
        Promise.resolve(requestHandler(req,res,next)).catch((err) => next(err))
    }
}


export {asyncHandler};

//How did it happened?
//const asyncHandler = () => {}
//const asyncHandler = (func) => { () => {} } 
//const asyncHandler = (func) => async () => {} 



//****Creating a wrapper function */    
//using try catch
/*const asyncHandler = (fn) => async( req, res , next) => {
    try{
        await fn(req,res,next)
    }catch(err){
        res.status(err.code || 500).json({
            success :  false,
            message : err.message
        })
    }

}*/
