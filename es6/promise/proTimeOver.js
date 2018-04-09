let timeOver = () => { 
    return new Promise((resolve,reject) => {
            resolve()
    })
}

timeOver()
    .then(() => {
        console.log('妈妈给我钱')
    })
    .then(()=>{
        console.log('我去书店')
    })
    .then(()=>{
        console.log('买了本JS书') 
    })