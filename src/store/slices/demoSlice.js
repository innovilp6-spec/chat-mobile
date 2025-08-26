const DEMO_ACTION_TYPE= "DEMO_ACTION_TYPE";

export const demoAction= (payload)=>({
    type: DEMO_ACTION_TYPE,
    payload,
})


const initialState= {
    demoState: "",
}


export const thunkActionCreator= (dispatch,getState)=>{
    return async (url)=>{
        try{
            let res= await fetch(url);
            res= await res.json();
            dispatch(demoAction({demoState: res}));
        }catch(err){
            dispatch(demoAction({demoState:"Errored dummy"}));
        }
    }
}



const demoReducer= (state=initialState,action)=>{
    switch(action.type){
        case DEMO_ACTION_TYPE:
            return {
                ...state,
                demoState: payload.demoState,
            }
        default: return state;
    }
}

export default demoReducer;