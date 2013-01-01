<?php

// Response headers
//  (via http://www.dzone.com/snippets/php-headers-serve-json)
header('Cache-Control: no-cache, must-revalidate');
header('Expires: Mon, 26 Jul 1997 05:00:00 GMT');
header('Content-type: application/json');

// Global preprocessing
$store_filename = "store.json";
$post_body = file_get_contents("php://input");
$request = json_decode($post_body, true);
$store_str = file_get_contents($store_filename);
if ($store_str[0] != "{") {
    $store_str = '{ "activities": {} }';
}
$store = json_decode($store_str, true);

// Utility functions
function saveStore() {
    global $store, $store_filename;
    file_put_contents($store_filename, json_encode($store));
}

// Actions
switch ($_GET["action"]) {
case "createActivity":  createActivity();  break;
case "fetchActivities": fetchActivities(); break;
case "startActivity":   startActivity();   break;
case "stopActivity":    stopActivity();    break;
case "debugApp":        debugApp();        break;
default: echo "No action defined: " . $_GET["action"];
}

// Actions Implementations
function createActivity() {
    global $request, $store;
    
    $activity = $request["activity"];
    if (empty($activity)) {
        echo '{ "status": "fail" }';
        return;
    }
    else {
        $new_activity = json_decode('{ "sessions": [] }', true);
        $store["activities"][$activity] = $new_activity;
    }
    echo '{ "status": "success" }';
    saveStore();
}

function fetchActivities() {
    global $request, $store, $store_str;
    echo json_encode($store["activities"]);
}

function startActivity() {
    global $request, $store;
    
    $new_session = json_decode('{ "start": "'.$request["start"].'" }', true);
    $activity = $request["activity"];
    $store["activities"][$activity]["sessions"][] = $new_session;
    
    echo '{ "status": "success" }';
    saveStore();
}

function stopActivity() {
    global $request, $store;
    
    $activity = $request["activity"];
    $sessions =& $store["activities"][$activity]["sessions"];
    
    foreach ($sessions as &$value) {
        if ($value["start"] && !$value["stop"]) {
            $value["stop"] = $request["stop"];
            break;
        }
    }
    
    echo '{ "status": "success" }';
    saveStore();
}

function debugApp() {
    global $request, $store;
    var_dump($store);
    
    $sessions =& $store["activities"]["Work"]["sessions"];
    
    foreach ($sessions as &$value) {
        if ($value["start"] && !$value["stop"]) {
            $value["stop"] = "Timestamp";
            break;
        }
    }
    
    
    var_dump($store);
}

?>
