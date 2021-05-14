const socket = new WebSocket("ws://localhost:8080/websocket");
const data =
{
    authentication:
    {
        data:
        {
            isAuthenticated: true,
            isSSO: true,
            language: "en",
            ss: "U2FsdGVkX1/R0O+2jr4pkPNiQBcIdTWLJiiDUm82F/mUlPE7Y2pYG2bXnNoL/ZPhtEaYjRXbwDTCaqCM8p6ub2ucVKy6bm/PrSn83EAhgQc=",
            time: "2020-07-04T07:44:28.242Z",
            username: "gamesimulator_6358827"
        },
        username: "gamesimulator_6358827"
    }
}

socket.onopen = () => {
    setInterval(() => {
        for (let index = 0; index < 1; index++) {
            socket.send(JSON.stringify(data));
        }
    }, 1000);
}