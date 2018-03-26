
$.ajax({
    type: "post",
    url: "/list",
    data: {
        name:1,
        age:2
    },
    dataType: "json",
    success: function (response) {
        console.log(response)
    }
});

$.ajax({
    type: "get",
    url: "/index",
    data: {
        name:1,
        age:2
    },
    dataType: "json",
    success: function (response) {
        console.log(response)
    }
});