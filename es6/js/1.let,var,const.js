{
    let a = 10;
    var b = 1;
}
//console.log(a)  error
//console.log(b)   1 


for(let i = 0; i < 1000; i++){}
//console.log(i)  error 

for(var i = 0; i < 1000; i++){}
// console.log(i)   1000 


var arr = [];  
for(var i = 0; i < 3 ; i++){  
    arr.push(function(){  
        console.log(i);  
    });  
}  

arr.forEach(function(val,i){  
    console.log(val(),'val')
});  

// var arr = [];  
// for(let i = 0; i < 3 ; i++){  
//     arr.push(function(){  
//         console.log(i);  
//     });  
// }  
  
// arr.forEach(function(val,i){  
//     console.log(val(),'2');
// })
