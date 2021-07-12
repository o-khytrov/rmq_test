let connected = false;
var responseDiv = document.getElementById("response");
var requestDiv = document.getElementById("request");
const profilesKey = "connection_profiles";
let profile = {};
const options = {

    mode: 'code',
    modes: ['code', 'tree', 'text'],
    "search": true
}
const request_editor = new JSONEditor(requestDiv, options)
const response_editor = new JSONEditor(responseDiv, options)


window.api.receive("response", (msg) => {
    $("#btn_send").prop('disabled', false);
    $("#loader").hide();
    let status = msg.properties.headers.status;
    var alert = '';
    if (status == 200) alert = 'success';
    if (status == 500) alert = 'error';
    if (status == 400) alert = 'warning';

    $("#status").html(`<span class="dot ${alert}"></span> ${status}`);
    response_editor.set(JSON.parse(msg.payload))
});


window.api.receive("connected", (args) => {
    $("#btn_connect").text("Disconnect");
    $("#btn_connect").removeClass("btn-primary");
    $("#btn_connect").addClass("btn-danger");
    $("#connection_settings").hide();
    $("#work_area").show();
    $("#btn_send").show();
    $("#reply_queue").text(args.queue_name)

    connected = true;

});


window.api.receive("disconnected", (msg) => {
    $("#btn_connect").text("Connect");
    $("#btn_connect").addClass("btn-primary");
    $("#btn_connect").removeClass("btn-danger");
    $("#connection_settings").show();
    $("#work_area").hide();
    $("#btn_send").hide();
    $("#reply_queue").text("")
    connected = false;
});

jQuery(function () {

    var profilesJson = localStorage.getItem(profilesKey);

    if (profilesJson) {
        window.api.send("log", profilesJson);
        var profiles = JSON.parse(profilesJson);
        for (profile in profiles) {
            addProfileToTable(profiles[profile]);
        }
    }

    $("#btn_send").on('click', function () {
        response_editor.set({});
        $("#status").empty();
        $("#btn_send").prop('disabled', true);
        $("#loader").show();

        window.api.send("request", {
            payload: request_editor.getText(),
            routing_key: $("#routing_key").val()
        });
        setTimeout(cancelRequest, profile.timeout * 1000);
    });

    $("#btn_profiles_clear").on('click', function (e) {
        localStorage.removeItem(profilesKey);
        $("#profiles tr").remove();
        $("btn_profiles_clear").hide();
    });

    $("#btn_connect").on('click', function (e) {
        if (!connected) {
            profile = {
                host: $("#host").val(),
                vhost: $("#vhost").val(),
                exchange: $("#exchange").val(),
                username: $("#username").val(),
                password: $("#password").val(),
                id: generateGuid(),
                name: $("prof_name").val(),
                timeout: $("#timeout").val()
            };
            if ($('#remember').prop('checked', )) {
                saveProfile(profile);
            }

            window.api.send("connect", profile);

        } else {
            window.api.send("disconnect", {});
        }

    });

    $(".prof_rem").on('click', function (e) {
        var profileId = $(this).attr('data-prof');
        $(`#${profileId}`).remove();
        removeProfile(profileId);
    });


    $(".prof-link").on('click', function (e) {
        var profileId = $(this).attr('data-prof');

        let profiles = getProfiles();
        loadProfile(profiles[profileId]);
    });

    $("#remember").on('click', function (e) {
        if ($(this).prop('checked')) {
            $("#prof_name").show();
        } else {
            $("#prof_name").hide();
        }

    });
});

function loadProfile(profile) {
    $("#host").val(profile.host);
    $("#vhost").val(profile.vhost);
    $("#exchange").val(profile.exchange);
    $("#username").val(profile.username);
    $("#password").val(profile.password);
    $("#timeout").val(profile.timeout);
}

function getProfiles() {
    let profilesJson = localStorage.getItem(profilesKey);
    let profiles = {};
    if (profilesJson) profiles = JSON.parse(profilesJson);
    return profiles;
}

function saveProfile(profile) {
    let profiles = getProfiles();
    profiles[profile.id] = profile;
    localStorage.setItem(profilesKey, JSON.stringify(profiles));
    addProfileToTable(profile);
}

function removeProfile(profileId) {
    let profiles = getProfiles();
    delete profiles[profileId];
    localStorage.setItem(profilesKey, JSON.stringify(profiles));
}

function addProfileToTable(profile) {
    $("#profiles").append(`<tr id="${profile.id}"><td><a class="prof-link" data-prof="${profile.id}" href="#">${profile.host}</a></td><td><button data-prof="${profile.id}" class="btn btn-sm btn-danger prof_rem">remove</button></td></tr>`);
}

function generateGuid() {
    var result, i, j;
    result = '';
    for (j = 0; j < 32; j++) {
        if (j == 8 || j == 12 || j == 16 || j == 20)
            result = result + '-';
        i = Math.floor(Math.random() * 16).toString(16).toUpperCase();
        result = result + i;
    }
    return result;
}

function cancelRequest() {
    $("#btn_send").prop('disabled', false);
    $("#loader").hide();
    let status = "Timeout"
    var alert = 'error';
    $("#status").html(`<span class="dot ${alert}"></span> ${status}`);
}