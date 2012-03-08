## States of the Widget
#
#                              ┌──────┐
#   ┌─────┐                    │  up  │
#   │ del │                    └──────┘
#   └─────┘                       ∧
#      ∧                          │
#      │             ┌────────────┼────────────────────────┐
#      ∨             │            ∨                        ∨
#   ┌──────┐      ┌─────┐      ┌──────┐     ┌─────┐     ┌─────┐
#   │ empt │ <──> │ wrt │ <──> │ nav  │ ──> │ sel │ ──> │ add │
#   └──────┘      └─────┘      └──────┘     └─────┘     └─────┘
#      ∧             ∧            ∧                        │
#      └─────────────┼────────────┼────────────────────────┘
#                    │            │
#                    ∨            ∨
#                  ┌─────┐     ┌──────┐
#                  │ sug │     │ down │
#                  └─────┘     └──────┘

# Locals
widget_state = {current_input: "", suggestion_list: [], selected_suggestion: 0, added_items: [] }

# StateMachine graph description
window.sm = new W.SimpleStateMachine
  delete:     [ 'empty' ],
  empty:      [ 'writing', 'delete' ],
  writing:    [ 'writing', 'empty', 'suggest', 'navigation', 'add' ],
  suggest:    [ 'writing' ],
  add:        [ 'empty' ],
  navigation: [ 'up', 'down', 'select', 'writing' ],
  up:         [ 'navigation' ],
  down:       [ 'navigation' ],
  select:     [ 'add' ],

# StateMachine input (events) transitions
sm.transitions
  empty:      {delete: 'delete', new_input: 'writing'}
  writing:    {reset: 'empty', new_input: 'writing', delete: 'writing', godown: 'navigation', add: 'add'}
  navigation: {goup: 'up', godown: 'down', select: 'select', new_input: 'writing', exit: 'writing'}

sm.set_context(widget_state)

# State Actions
sm.states =
  delete: ->
    # remove the last tag
    d = this.added_items.pop()
    sm.dom.manipulation.remove_last_item()
    this.sm.go.empty()

  empty: (e) ->
    # just wait for input
    sm.dom.input.val('')
    sm.dom.manipulation.hide_suggestion_box()
    this.current_input = ''

  writing: (e, text) ->
    # just wait for triggers
    if text == "" then return this.sm.go.empty()
    if text? && this.current_input != text
      this.current_input = text
      matching_suggestions = _.filter(this.suggestion_list, (s) -> s.match(text))
      this.sm.go.suggest(matching_suggestions)

  suggest: (suggestions) ->
    # show/hide the courtain
    if suggestions.length > 0
      this.active_suggestions = suggestions
      sm.dom.manipulation.show_suggestion_box(suggestions)
    else
      sm.dom.manipulation.hide_suggestion_box()
      this.active_suggestions = []
    this.sm.go.writing()

  add: (item) ->
    # add one tag to the store
    if (item ||= this.current_input) && item != ""
      this.added_items.push item
      sm.dom.manipulation.add_item(item)
    this.sm.go.empty()

  navigation: ->
    # enter in nav-mode
    if this.active_suggestions.length == 0 then this.sm.go.writing()
    if this.selected_suggestion < 0
      this.selected_suggestion = 0
      sm.dom.manipulation.hide_suggestion_box()
      this.sm.send('exit')
    sm.dom.manipulation.highlight_suggestion(this.selected_suggestion+1)

  up: ->
    # move one position up in the list (nav-mode)
    this.selected_suggestion -= 1
    this.sm.go.navigation()

  down: ->
    # move one position down in the list (nav-mode)
    this.selected_suggestion += 1
    this.sm.go.navigation()

  select: (item) ->
    # item selected in nav-mode
    console.log "select: #{item}"
    item ||= this.active_suggestions[this.selected_suggestion]
    this.sm.go.add(item)

# General Actions
sm.actions =
  remove_item: (text) ->
    sm.context.added_items = _.without(sm.context.added_items, text)

# DOM events -> SM events
sm.bindings = ->
  sm.dom.input.keyup (e) ->
    value = sm.dom.input.val()
    switch e.keyCode
      when 40 then sm.send('godown')
      when 38 then sm.send('goup')
      when 32,188 then sm.send('add')
      when 13 then sm.send('select')
      # Need to preventDefault in some cases
      when 8 then sm.send('delete', e, value)
      when 27 then sm.send('exit')
      else sm.send('new_input', e, value)

# DOM boilerplate
sm.dom =
  input: null,
  added_items: null,
  suggestion_box: null

  initialize: ->
    sm.dom.input          = $('#demo-input')
    sm.dom.added_items    = $('#added-items')
    sm.dom.suggestion_box = $('#suggestion-box')

  manipulation:
    add_item: (text) ->
      item = $(sm.templates.item).prepend(text)
      item.find('a').click -> sm.actions.remove_item(text); item.remove()
      sm.dom.added_items.append(item)
    remove_last_item: ->
      sm.dom.added_items.find('li:last-child').remove()
    show_suggestion_box: (suggestion_list) ->
      items = _.map suggestion_list, (sug) ->
        $(sm.templates.sug_item)
          .text(sug)
          .click(-> sm.send('add', sug))
          .css('cursor', 'pointer')
      sm.dom.suggestion_box.html('')
      _.each items, (i) -> sm.dom.suggestion_box.append(i)
      sm.dom.suggestion_box.slideDown()
    hide_suggestion_box: ->
      sm.dom.suggestion_box.slideUp()
    highlight_suggestion: (position) ->
      sm.dom.suggestion_box.find("li").css('color', 'black')
      sm.dom.suggestion_box.find("li:nth-child(#{position})").css('color', 'red')
    close_suggestion_box: ->
      sm.dom.suggestion_box.slideUp()

sm.templates =
  item:     '<li class="item"><a href="#">x</a></li>'
  sug_box:  '<div class="suggestion-box"><ul></ul></div>'
  sug_item: '<li class="sug-item"></li>'

# Initalization
$ ->
  sm.dom.initialize()
  sm.bindings()
  sm.context.suggestion_list = ["hola", "hello", "ahoy!", "bonjorno", "halo", "buenas", "akandemorl", "jarl"]
  sm.start('empty')
