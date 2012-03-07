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

widget_state = {current_input: "", suggestion_list: [], selected_suggestion: 0, added_items: [] }

sm = new W.SimpleStateMachine
  delete:     [ 'empty' ],
  empty:      [ 'writing', 'delete' ],
  writing:    [ 'writing', 'empty', 'suggest', 'navigation', 'add' ],
  suggest:    [ 'writing' ],
  add:        [ 'empty' ],
  navigation: [ 'up', 'down', 'select', 'writing' ],
  up:         [ 'navigation' ],
  down:       [ 'navigation' ],
  select:     [ 'add' ],

sm.transitions
  empty:      {delete: 'delete', new_input: 'writing'}
  writing:    {reset: 'empty', new_input: 'writing', delete: 'writing', godown: 'navigation', add: 'add'}
  navigation: {goup: 'up', godown: 'down', select: 'select', new_input: 'writing', exit: 'writing'}

sm.set_context(widget_state)

sm.states =
  delete: ->
    # remove the last tag
    d = this.added_items.pop()
    console.log "Deleting #{d}..."
    this.sm.go.empty()

  empty: ->
    # just wait for input
    sm.dom.input.val('')
    this.current_input = ''
    console.log 'empty I am!'

  writing: (e, text) ->
    # just wait for triggers
    if text == "" then return this.sm.go.empty()
    console.log "writing: #{text}"
    this.current_input = text

  suggest: ->
    # show/hide the courtain
    console.log "suggesting on: #{text}"
    this.sm.go.writing()

  add: ->
    # add one tag to the store
    if (item = this.current_input) && item != ""
      this.added_items.push item
      console.log "NEW ITEM [#{this.current_input}]"
      console.log "  - item list: #{this.added_items}"
    this.sm.go.empty()

  navigation: ->
    # enter in nav-mode
    if this.selected_suggestion < 0
      console.log 'Quit navigation'
      this.selected_suggestion = 0
      this.sm.send('exit')
    console.log "Enterin navigation state"
    console.log "  - current selection: #{this.selected_suggestion}"

  up: ->
    # move one position up in the list (nav-mode)
    console.log "Going up in navigation!"
    this.selected_suggestion -= 1
    this.sm.go.navigation()

  down: ->
    # move one position down in the list (nav-mode)
    console.log "Going down in navigation!"
    this.selected_suggestion += 1
    this.sm.go.navigation()

  select: ->
    # item selected in nav-mode
    console.log "item selected: #{this.selected_suggestion}"
    this.current_input = this.suggestion_list[this.selected_suggestion]
    this.sm.go.add()

sm.actions =
  remove_item: (text) ->
    sm.context.added_items = _.without(sm.context.added_items, text)

sm.dom =
  input: null,
  added_items: null,
  suggestion_box: null

  initialize: ->
    sm.dom.input          = $('#demo-input')
    sm.dom.added_items    = $('#added-items')
    sm.dom.suggestion_box = $('#suggestion-box')

  manipulation:
    add_item: (text, id) ->
      item = $(sm.templates.item).prepend(text)
      item.find('a').click -> sm.actions.remove_item(text); item.remove()
    show_suggestion_box: (suggestion_list) ->
      items = _.map suggestion_list, (sug) -> $(sm.templates.sug_item).text(sug)
      sm.dom.suggestion_box.append(items).slideDown()
    highlight_suggestion: (position) ->
    close_suggestion_box: ->
      sm.dom.suggestion_box.slideUp()

sm.templates =
  item:     '<li class="item"><a href="#">x</a></li>'
  sug_box:  '<div class="suggestion-box"><ul></ul></div>'
  sug_item: '<li class="sug-item"></li>'

sm.bindings = ->
  sm.dom.input.keyup (e) ->
    value = sm.dom.input.val()
    switch e.keyCode
      when 40 then sm.send('godown')
      when 38 then sm.send('goup')
      when 32,188
        sm.send('add')
      when 13 then sm.send('select')
      # Need to preventDefault in some cases
      when 8 then sm.send('delete', e, value)
      when 27 then sm.send('exit')
      else sm.send('new_input', e, value)

$ ->
  sm.dom.initialize()
  sm.bindings()
  sm.start('empty')
