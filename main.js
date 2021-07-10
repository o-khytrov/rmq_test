// Modules to control application life and create native browser window
const {
  app,
  ipcMain,
  BrowserWindow
} = require('electron')
const path = require('path')
var amqp = require('amqplib/callback_api');
let mainWindow;
let _connection;
let channel;
let queue_name;

function createWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    icon: "rabbitmq-logo.png",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  })

  // and load the index.html of the app.
  mainWindow.loadFile('index.html')

  // Open the DevTools.
  // mainWindow.webContents.openDevTools()
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

ipcMain.on("log", (event, args) => {
  console.log(args);

})

ipcMain.on("request", (event, args) => {
  console.log(args);
  channel.sendToQueue(args.routing_key, Buffer.from(args.payload), {
    replyTo: queue_name
  });

});


ipcMain.on("disconnect", (event, args) => {

  _connection.close();
  mainWindow.webContents.send("disconnected", {});

});
// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
ipcMain.on("connect", (event, args) => {


  var options = {
    protocol: 'amqp',
    hostname: args.host,
    port: 5672,
    username: args.username,
    password: args.password,
    locale: 'en_US',
    vhost: args.vhost
  }

  amqp.connect(options, function (error0, connection) {
    if (error0) {
      throw error0;
    }
    _connection = connection;
    connection.createChannel(function (error1, ch) {
      if (error1) {
        throw error1;
      }
      channel = ch;
      ch.assertQueue('', {
        exclusive: true
      }, function (error2, q) {
        if (error2) {
          throw error2;
        }
        queue_name = q.queue;
        console.log(" [*] Waiting for messages in %s. To exit press CTRL+C", q.queue);
        mainWindow.webContents.send("connected", {
          queue_name: q.queue
        });
        ch.bindQueue(q.queue, args.exchange, '');

        ch.consume(q.queue, function (msg) {
          let payload;

          if (msg.content) {
            payload = msg.content.toString()

          }
          mainWindow.webContents.send("response", {
            payload,
            properties: msg.properties
          });
        }, {
          noAck: true
        });
      });

    });
  });
});