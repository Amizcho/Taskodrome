var m_mainPanel_st;

var m_statusList = [];

var m_issues_st = [];

var m_cardDescArray_st = [];
var m_selectedCard_st = { value : null,
                          mousePos : { X : 0, Y : 0 },
                          sourceIndex : null };

var m_columnWidth_st = { value : null };

var m_parentSize_st = { width : null,
                        height : null };

var m_bugsToSend_st = [];

var m_statusByColumns = [];
var m_columnByStatus = [];

function statusInit() {
  m_mainPanel_st = new createjs.Stage("panel_st");
  m_mainPanel_st.enableMouseOver(4);

  m_statusList = getStatusList_st();

  var parentDiv = document.getElementById("st-grid");

  m_parentSize_st.width = parseInt(window.getComputedStyle(parentDiv).getPropertyValue("width"));
  m_parentSize_st.height = parseInt(window.getComputedStyle(parentDiv).getPropertyValue("height"));

  createColumnStatusMap();
  sortIssues_st();

  draw_st();
};

function draw_st() {
  m_mainPanel_st.clear();
  m_mainPanel_st.uncache();
  m_mainPanel_st.removeAllChildren();
  m_mainPanel_st.removeAllEventListeners();

  var panelCanvas = document.getElementById("panel_st");
  panelCanvas.width = m_parentSize_st.width;
  panelCanvas.height = m_parentSize_st.height;

  createTable(m_issues_st, m_cardDescArray_st, m_statusList, m_mainPanel_st, "panel_st",
              true, m_selectedCard_st, m_parentSize_st, onPressUp_st, m_columnWidth_st);
  m_mainPanel_st.update();
};

function onPressUp_st(evt) {
  setHrefMark(window, "sg");

  var newColumnIndex = computeColumnIndex(evt.stageX, m_issues_st, H_OFFSET, m_columnWidth_st.value);
  var currStatus = getStatusByColumn_st(m_selectedCard_st.sourceIndex.i);
  var newStatus = getStatusByColumn_st(newColumnIndex);

  if(newColumnIndex == -1
    || !isStatusAllowed(m_selectedCard_st.value.id, currStatus, newStatus)) {
    newColumnIndex = m_selectedCard_st.sourceIndex.i;
  }

  if(m_selectedCard_st.sourceIndex.i != newColumnIndex) {
    m_issues_st[m_selectedCard_st.sourceIndex.i].splice(m_selectedCard_st.sourceIndex.k, 1);
    m_issues_st[newColumnIndex].splice(m_issues_st[newColumnIndex].length, 0, m_selectedCard_st.value);

    var status = getStatusByColumn_st(newColumnIndex);
    m_selectedCard_st.value.status = status;
    m_selectedCard_st.value.updateTime = Math.round((new Date().getTime()) / 1000);

    var handler_id = m_selectedCard_st.value.handler_id;
    var bug_id = m_selectedCard_st.value.id;
    m_bugsToSend_st.push({ handler_id : handler_id, bug_id : bug_id, status : status });

    if (m_bugsToSend_st.length == 1) {
      sendRequest_st(0);
    }

    setHrefMark(window, "sg");
  }

  m_selectedCard_st.value = null;

  fullRedraw();
};

function sendRequest_st(bugIndex) {
  var requestToken = new XMLHttpRequest();
  var address = getPathToMantisFile(window, "bug_change_status_page.php");
  requestToken.open("POST", address, true);
  requestToken.setRequestHeader("Content-type", "application/x-www-form-urlencoded");

  function tokenOnReadyStateChange() {
    if (requestToken.readyState == 4 && requestToken.status == 200) {
      var page_text = requestToken.responseText;
      var security_token = getValueByName_st(page_text, "bug_update_token");
      var last_updated = getValueByName_st(page_text, "last_updated");

      var requestUpdate = new XMLHttpRequest();
      var address = getPathToMantisFile(window, "bug_update.php");
      requestUpdate.open("POST", address, true);
      requestUpdate.setRequestHeader("Content-type", "application/x-www-form-urlencoded");

      function reqUpdateOnReadyStateChanged() {
        if (requestUpdate.readyState == 4 && requestUpdate.status == 200) {
          if(bugIndex < m_bugsToSend_st.length - 1) {
            sendRequest_st(bugIndex + 1);
          } else if(m_bugsToSend_st.length > 0) {
            m_bugsToSend_st.length = 0;
          }
        }
      };
      requestUpdate.onreadystatechange = reqUpdateOnReadyStateChanged;

      var bug_update_token = security_token;
      var handler_id = m_bugsToSend_st[bugIndex].handler_id;
      var bug_id = m_bugsToSend_st[bugIndex].bug_id;
      var status = m_bugsToSend_st[bugIndex].status;
      var parameters = "bug_update_token=" + bug_update_token
      + "&handler_id=" + handler_id + "&bug_id=" + bug_id
      + "&status=" + status + "&last_updated=" + last_updated;
      requestUpdate.send(parameters);
    }
  };
  requestToken.onreadystatechange = tokenOnReadyStateChange;

  var bug_id = m_bugsToSend_st[bugIndex].bug_id;
  var status = m_bugsToSend_st[bugIndex].status;
  var parameters = "id=" + bug_id + "&new_status=" + status;
  requestToken.send(parameters);
};

function createColumnStatusMap() {
  var statusCodes = getStatusCodes_st();

  if (m_statusList[m_statusList.length - 1] == '') {
    m_statusList.pop();
  }

  for (var i = 0; i != m_statusList.length; ++i) {
    var status = m_statusList[i];
    var statusNameL = status.toLowerCase();
    m_statusByColumns[i] = statusCodes[statusNameL];
  }

  for (var i = 0; i != 91; ++i) {
    m_columnByStatus[i] = m_statusList.length;
  }

  for (var i = 0; i != m_statusByColumns.length; ++i) {
    var index = parseInt(m_statusByColumns[i]);
    m_columnByStatus[index] = i;
  }
};

function sortIssues_st() {
  m_issues_st = [];
  for(var i = 0; i != m_statusList.length + 1; ++i) {
    m_issues_st[i] = [];
  }

  for(var i = 0; i != m_issues_raw.length; ++i) {
    var columnIndex = getColumnByStatus_st(m_issues_raw[i].status);
    var posIndex = m_issues_st[columnIndex].length;
    m_issues_st[columnIndex][posIndex] = m_issues_raw[i];
  }
};

function getValueByName_st(page_text, name) {
  var prefix = 'name="' + name + '" value="';
  var src_string = page_text.match(new RegExp('.*' + prefix + '.*'))[0];
  var start_index = src_string.indexOf(prefix) + prefix.length;
  return src_string.substr(start_index, src_string.indexOf("\"", start_index + 1) - start_index);
};

function getStatusByColumn_st(columnIndex) {
  if (columnIndex >= 0) {
    return m_statusByColumns[columnIndex];
  } else {
    return '90';
  }
};

function getColumnByStatus_st(status) {
  return m_columnByStatus[parseInt(status)];
};

function getStatusList_st() {
  var ret = [];
  var statusString = document.getElementsByClassName("status_board_order")[0].getAttribute("value");
  if (!checkExistence("getStatusList_st", statusString)) {
    return ret;
  }

  ret = statusString.split(';');
  ret = ret.splice(0, ret.length - 1);
  return ret;
};

function getStatusCodes_st() {
  var ret = [];
  var statusNameMap = document.getElementsByClassName("status_name_map")[0].getAttribute("value");
  if (!checkExistence("getStatusCodes_st", statusNameMap)) {
    return ret;
  }
  var pairs = statusNameMap.split(';');

  for (var i = 0, l = pairs.length; i != l - 1; ++i) {
    var pair = pairs[i].split(':');
    ret[pair[1].toLowerCase()] = pair[0];
  }

  return ret;
};
