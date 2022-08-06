function main(){
	function el_open(event){ console.log("el_open:", event.data, event); }
	function el_message(event){ 
		let json;
		try{ json = JSON.parse(event.data); }
		catch(e){
			console.log("WASN'T JSON", json);
			json = {};
		}
		if(json.mode == "CONNECT"){
			console.log(json); 
			console.log("SENDING REQUEST");
			wstest.send("updateVram");
		}
		else{
			console.log(json); 
		}
	}
	function el_close(event){ console.log("el_close:", event.data, event); }
	function el_error(event){ console.log("el_error:", event.data, event); }
	let wstest = new WebSocket("ws://192.168.2.66:7778");
	wstest.onopen    = el_open;
	wstest.onmessage = el_message;
	wstest.onclose   = el_close;
	wstest.onerror   = el_error;
}
main();