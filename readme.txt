TIMECKS

Top Left Buttons

  Settings & Info
  Toggles "Settings & Info Buttons".

  Hide-Alarms Mode
  Allows you to enable/disable alarms, switch back to regular mode when done.

  Trash
  You can delete an alarm by Dragging and Dropping it onto the Trash button.

  Add new alarm
  Opens dialogs for name, then time.


Settings & Info Buttons

  Default Snooze
  Opens dialog to edit default Snooze duration.

  Default AlarmTime View
  Opens dialog to edit default Time View for new alarm.

  Alarms raw data
  Edit with care, this is basically the database in JSON text.

  Read Me
  Opens dialog that displays readme.txt.
  Displayed text won't wrap, you might need to enlarge window.



Alarms
  On/Off Button
  Usually, the top (soonest) alarm gets auto-activated, will ring at set time.
  However, you can prevent an alarm from ringing by turning it off.

  AlarmTime View
  AlarmTime View can be either, the time, or the countdown (example: "1h 15m").
  Time/Countdown temporarily toggles when your mouse cursor hovers over it.
  Also, a mouse longpress will persistently toggle Time/Countdown.

  Inputting time
  The dialog contains a live "preview" of the time based on your input.
  There are built-in patterns that allow for shorthands when typing.

  There are 4 alarm types
    Daily
    example: 1:00 AM

    Weekly
    example: SUN 11:00 PM
    Note the 3 letter day of the week, shorthand requires at least 2 letters.

    Monthly
    example: ?/13 7:00 PM
    Note the "?"

    Annually
    example: 12/26 2:39 AM

  Default is "AM". For PM, append "PM", or shorthand "p", or even "*" (numpad friendly).
  example: 12/26 2:39p

  Instead of ":", you can use "." (numpad friendly).
  example: 2.39 becomes: 2:39 AM
  In fact, you can even leave out the ":" altogether.
  example: 316p becomes: 3:16 PM


  Time with Offset (only used when inputting the time, offset is factored in to create a normal time).
  Right after the time portion, you can add or subtract an amount of time (max 24 hrs).
  example for subtract 1hr:
    1:45 PM-1 becomes: 12:45 PM
  example for add 2hr:
    1:45 PM+2 becomes: 3:45 PM

  For minutes, number starts with a "0".
  example for subtract 1min:
    1:45 PM-01 becomes: 1:44 PM
  example for add 15min:
    1:45 PM+015 becomes: 2:00 PM

  Can also do offset with hr AND min.
  example for add 1hr and 30min:
    3:30 PM+1:30 becomes: 5:00 PM

  Offet by itself is also possible.
  example for 5hr from now:
    +5
  example for 5min from now:
    +05
  example for 2hr and 30min from now:
    +230


  For Annually and Monthly, its possible to specify "last day" of the month.
    Annually, last day of the month
      example: 2/31 2:39 AM
    Monthly, last day of the month
      example: ?/31 7:00 PM
  Note day "31", any day beyond the last day of the month will be considered "MonthEnd".
  So, 2/30 will also "MonthEnd" to day 28 (leap year, day 29).
