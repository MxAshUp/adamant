var count = function* (){
	setTimeout(function() {
	    yield 1;
	},1000);
}


for (var x of count()) {
  console.log(x)
}