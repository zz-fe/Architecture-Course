//通常我们写异步的话  这么写 


let timeOver = (fn) => fn() 

timeOver(()=>{
    console.log('妈妈给我钱')
    timeOver(()=>{
        console.log('我去书店') 
        timeOver(()=>{
            console.log('买了本JS书') 
        })
    })
})

