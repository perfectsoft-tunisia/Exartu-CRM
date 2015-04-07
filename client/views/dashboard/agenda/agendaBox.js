var allTasks = [];
var mineQuery = {};
var showMineOnly = true;
var showToday = true;
var showNext = false;
var showPrev = false;
var showByMonth = true;
var showByWeek = false;
var showByDay = false;
var start;
var end;
var init = false;
var loadingCount = false;
var currentMonth = new ReactiveVar();

CalendarController = RouteController.extend({
    template: 'agendaBox'
});

var startEndDep = new Deps.Dependency();
var loadingDep = new Deps.Dependency();

var handler;
Meteor.autorun(function () {
    // depend start, end
    startEndDep.depend();

    if (!start || !end || (showMineOnly== null)) return;

    loadingCount = true;
    loadingDep.changed();

    handler && handler.stop();

    init = false;
    handler = Meteor.subscribe("calendarTasks", start, end, showMineOnly , function () {
        rerender();
        loadingCount = false;
        loadingDep.changed();
    });

});

Template.agendaBox.created=function() {
    var calendarDiv = $('.fc');
    startEndDep.changed();
};

Template.agendaBox.destroyed=function() {};

var rerender = _.debounce(function () {
    var calendarDiv = $('.fc');
    calendarDiv.fullCalendar( 'refetchEvents');
    calendarDiv.find('.fc-month-view > table').addClass('table');
    calendarDiv.find('.fc-month-view table .fc-row.fc-widget-header').attr('style', '');
    init = true;
},650);

Template.agendaBox.helpers({

    options: function () {
        return {
            id: 'dashboard-calendar',
            monthNames: ['January', 'February', 'March', 'April', 'May', 'June', 'July',
                'August', 'September', 'October', 'November', 'December'],
            nextDayThreshold: "00:00:00",
            firstDay: 1,
            fixedWeekCount: false,
            eventLimit: true,
            header:false,
            timeFormat:'HH:mm',
            events: function (start, end, timezone, callback) {
                callback(_.map(CalendarTasks.find({}).fetch(), function (t) {
                    switch(t.state) {
                        case Enums.taskState.future:
                            return {id: t._id,title: t.msg, start: t.begin, end: t.end, description:"", className:'item-label-2 label-future  pointer'  } ;
                            break;
                        case Enums.taskState.completed:
                            return {id: t._id,title: t.msg, start: t.begin, end: t.end, description:"", className:'item-label-2 label-completed  pointer'  } ;
                            break;
                        case Enums.taskState.overDue:
                            return {id: t._id, title: t.msg, start: t.begin, end: t.end, description:"", className:'item-label-2 label-overDue  pointer'  } ;
                            break;
                        case Enums.taskState.pending:
                            return {id: t._id, title: t.msg, start: t.begin, end: t.end, description:"", className:'item-label-2 label-pending  pointer'  };
                            break;
                    }

                }));
            },
            viewRender: function (view, element) {
                //searching by class because id isn't working
                var calendarDiv = $('.fc');
                start = view.start.local().toDate();
                end = view.end.local().toDate();
                //this correct the calendar end date
                //end = new Date(endAux.setDate(endAux.getDate()+1));
                startEndDep.changed();
            },
            eventRender: function( event, element, view ){
                var currentDate = event.start.format('YYYY-MM-DD');
                var calendarDiv = $('.fc');

                var dayCell = calendarDiv.find('td[data-date="'+currentDate+'"]');
                if( dayCell.find('.day-tasks').length ){
                    //console.log('number of elements : '+dayCell.find('.day-tasks i.fa-circle').length);
                    if( dayCell.find('.day-tasks i.fa-circle').length ){
                        if( dayCell.find('.day-tasks i.fa-circle').length < 3 ){
                            //console.log('adding circle X for date : '+currentDate);
                            dayCell.find('.day-tasks').append('<i class="fa fa-circle"></i>');
                        }
                    }
                    else{
                        //console.log('adding circle Y for date : '+currentDate);
                        dayCell.find('.day-tasks').append('<i class="fa fa-circle"></i>');
                    }
                }
                else{
                    dayCell.append('<div class="day-tasks"><i class="fa fa-circle"></i></div>');
                }
            },
            dayRender: function(date, cell) {
                //var calendarDiv = $('.fc');
                var currentDate = date.format('D');
                cell.html('<a href="#">'+currentDate+'</a>');
                //
                //console.log('outside : '+currentDate);
                ////console.log(cell);
                //
                //var eventCount = calendarDiv.fullCalendar( 'clientEvents', function(eventObj){
                //    console.log('inside : '+currentDate);
                //    if (eventObj.start.format('YYYY-MM-DD') == currentDate) {
                //        return true;
                //    } else {
                //        return false;
                //    }
                //}).length;
                //console.log(eventCount);
            },
            dayClick: function(date, jsEvent, view) {
                var calendarDiv = $('.fc');
                var events = [];
                var eventCount = calendarDiv.fullCalendar( 'clientEvents', function(eventObj){
                    if( eventObj.start.format('YYYY-MM-DD') == date.format('YYYY-MM-DD') ) {
                        events.push(eventObj);
                        return true;
                    } else {
                        return false;
                    }
                }).length;

                //alert('we have '+eventCount+' events');
                //console.log(events);
                if(events.length){
                    //console.log('intra aici');
                    var html = '';
                    if( $('.calendar-widget .list-type-8').length )
                        $('.calendar-widget .list-type-8').html('');
                    else
                        $('.calendar-widget').append('<ul class="list-type-8"></ul>');

                    _.each(events, function(item){
                        var event = Tasks.findOne({_id: item.id});
                        html = '<li><a class="item-icon item-icon-tasks item-icon-sm" href="#"><i class="ico-tasks"></i></a><div class="item-content"><div class="title"><a href="#">';
                        html += item.title;

                        if(event && event.assign && event.assign.length){
                            var user = Meteor.users.findOne({_id:event.assign[0]});
                            if(user){
                                var name = (user.username ? user.username : user.emails[0].address);
                                html += '<p class="desc">'+name+'</p>';
                            }
                            else{
                                html += '<p class="desc"><i>unassigned</i></p>';
                            }
                        }
                        else
                            html += '<p class="desc">unassigned</p>';

                        html += '</a></div></div></li>';
                        $('.calendar-widget .list-type-8').append(html);
                    });
                }
            },
            eventAfterAllRender: function(view){
                var calendarDiv = $('.fc');
                var calendarDate = calendarDiv.fullCalendar('getDate');
                var html = '';

                if( calendarDate && calendarDate.format('YYYY-MM') == moment().format('YYYY-MM') )
                    html = "Today <span>"+moment().format('D')+"<sup>`th</sup> "+moment().format('MMMM')+"</span>";
                else
                    html = calendarDiv.fullCalendar('getView').title;

                currentMonth.set(html);

                // cleanup the calendar view
                calendarDiv.find('.fc-content-skeleton').remove();
                calendarDiv.find('.fc-other-month a').remove();
                calendarDiv.find('.fc-other-month .day-tasks').remove();

            },
            loading: function(bool) {
                var calendarDiv = $('.fc');
                if (bool){
                    calendarDiv.find('.tasks-navi .current').hide();
                }
                else{
                    calendarDiv.find('.tasks-navi .current').show();
                }
            }
        }
    },
    taskCount: {
        title:function(){
            loadingDep.depend();
            if(loadingCount){
                return ""
            }
            return "tasks";
        },



        count: function(){
            loadingDep.depend();
            if(loadingCount){
                return "loading..."
            }
            return CalendarTasks.find({}).count();
        }
    },





    query: function () {
        return query;
    },
    showMineOnly: function () {
        startEndDep.depend();
        return showMineOnly ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-default';
    },
    showToday: function(){
        startEndDep.depend();
        return showToday ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-default';
        //cambiar el return
    },
    showNext: function(){
        startEndDep.depend();
        return showNext ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-default';
    },
    showPrev: function(){
        startEndDep.depend();
        return showPrev ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-default';
    },
    showByMonth: function(){
        startEndDep.depend();
        return showByMonth ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-default';
        //cambiar el return
    },
    showByWeek: function(){
        startEndDep.depend();
        return showByWeek ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-default';
    },
    showByDay: function(){
        startEndDep.depend();
        return showByDay ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-default';
    },
    currentMonth: function(){
        return currentMonth.get();
    }

});


Template.agendaBox.events = {
    'click #next-month-btn': function () {

        var calendarDiv = $('.fc');
        calendarDiv.fullCalendar('next');
        var today = new Date();
        if((today>start) && (today<end)){
            showToday = true;
            showNext = false;
            showPrev = false;
        }
        else if(today>end){
            showToday = false;
            showNext = false;
            showPrev = true;
        }
        else if(today<start){
            showToday = false;
            showNext = true;
            showPrev = false;
        }
        startEndDep.changed();
    },
    'click #prev-month-btn': function () {

        var calendarDiv = $('.fc');
        calendarDiv.fullCalendar('prev');
        var today = new Date();
        if((today>start) && (today<end)){
            showToday = true;
            showNext = false;
            showPrev = false;
        }
        else if(today>end){
            showToday = false;
            showNext = false;
            showPrev = true;
        }
        else if(today<start){
            showToday = false;
            showNext = true;
            showPrev = false;
        }
        startEndDep.changed();
    }
};