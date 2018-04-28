let timeOver = () => { 
    return new Promise((resolve,reject) => {
        let money = Math.ceil(Math.random(0,100)*100) 
        if(money > 50) {
            resolve()
        }else{
            reject()
        }
    })
}

timeOver()
    .then( 
        () => {console.log('妈妈给我钱')},
        () => {console.log('差钱啊')
    })
    .then(()=>{console.log('我去书店')
    })
    .then(()=>{
        console.log('买了本JS书') 
    })