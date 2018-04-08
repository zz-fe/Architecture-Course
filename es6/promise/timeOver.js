//通常我们写异步的话  这么写 


let timeOver = (fn) => {
    setTimeout(() => { fn() },3000)
} 

timeOver(()=>{
    console.log('30后执行')
    timeOver(()=>{
        console.log('60后执行') 
    })
})

