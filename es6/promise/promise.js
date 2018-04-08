let timeOver = () => { 
    return new Promise((resolve,reject) => {
        setTimeout(resolve,3000)
    })
}

timeOver()
    .then(() => {
        console.log('30s执行')
    })
    .then(()=>{
        console.log('60s执行')
    })