/**
   @summary Stuff that will go into conductance
*/

@ = require([
  'mho:std',
  'mho:app',
  {id:'mho:surface/nodes', name:'nodes'},
  {id:'sjs:sjcl', name:'sjcl'},
  {id:'mho:surface/field', name:'field'}
]);

var cmd = exports.cmd = {};

/**
   @function cmd.Click
   @summary XXX write me
*/
cmd.Click = function(element, cmd, param) {

  var Enabled = @ObservableVar(false);
  var emitter;
  
  var methods = {
    cmd: cmd,
    isActive: function() { return !!emitter },
    setEmitter: function(e) { emitter = e; Enabled.set(!!e); }
  };

  return element ..
    @Attrib('__oni_cmd_emitter', true) ..
    @Mechanism(function(node) {
      // install api with which receivers can bind to us:
      node.__oni_cmd = methods;
      hold(0);
      if (!methods.isActive()) {
        // if we're not bound yet, attempt to find receiver to bind to:
        do {
          if (node.__oni_cmd_receivers) {
            node.__oni_cmd_receivers .. @each {
              |rec|
              if (rec.bound_commands && rec.bound_commands.indexOf(methods.cmd) === -1)
                continue;
              rec.cmd_nodes.push(methods);
              methods.setEmitter(rec.emitter);
              return; // we're bound
            }
          }
          node = node.parentNode;
        } while (node);
      }
    }) ..
    @On('click',
        {handle:@dom.preventDefault},
        ev -> emitter ? emitter.emit([cmd,
                                      param!==undefined ?
                                      (typeof param === 'function' ? param(ev) : param) :
                                      ev
                                     ])
       ) ..
    @Enabled(Enabled);
};

/**
   @function cmd.stream
   @summary XXX write me
*/
cmd.stream = function(/*[dom_root], [commands]*/) {

  var args = arguments;
  
  return @Stream(function(downstream) {

    // untangle arguments:
    var root, bound_commands;
    if (args.length === 1) {
      if (Array.isArray(args[0]))
        bound_commands = args[0];
    }
    else if (args.length === 2) {
      root = args[0];
      bound_commands = args[1];
    }
    else if (args.length !== 0)
      throw new Error("Surplus arguments supplied to cmd::Stream()");
    
    var emitter = @Emitter();
    var disable_inputs = @Emitter();

    while (1) {
      waitfor {
        try {
          var cmd_nodes = [];

          // install a handler where retrospectively added command emitters can bind themselves:
          var cmd_receiver = {
            bound_commands: bound_commands,
            cmd_nodes: cmd_nodes,
            emitter: emitter
          };
          root .. @nodes.Nodes() .. @each {
            |node|
            var receivers = node.__oni_cmd_receivers;
            if (!receivers)
              receivers = node.__oni_cmd_receivers = [];
            receivers.push(cmd_receiver);
          }

          // proactively bind existing command emitters:
          root .. @nodes.Nodes('[__oni_cmd_emitter]') ..
            @each {
              |node|
              if (!node.__oni_cmd || /* node has probably just been added */
                  node.__oni_cmd.isActive() ||
                  (bound_commands && bound_commands.indexOf(node.__oni_cmd.cmd) === -1))
                continue;
              cmd_nodes.push(node.__oni_cmd);
              node.__oni_cmd.setEmitter(emitter);        
            }

          // keep up bindings until 'disable_inputs' fires
          disable_inputs .. @wait();
          
        }
        finally {
          cmd_nodes .. @each {
            |__oni_cmd|
          __oni_cmd.setEmitter(null);
          }

          root .. @nodes.Nodes() .. @each {
            |node|
            var receivers = node.__oni_cmd_receivers;
            if (receivers)
              receivers .. @remove(cmd_receiver);
          }
        }
      }
      and {
        emitter .. @each {
          |cmd_param|
          var downstream_taking_time = false;
          waitfor {
            downstream(cmd_param);
          }
          or {
            hold(100);
            downstream_taking_time = true;
            disable_inputs.emit();
            hold();
          }
          if (downstream_taking_time)
            break; // force outer loop
        }
      }
    }
  });
};


// helper to display a popup window
/** 
    @function withPopupWindow
    @summary XXX write me
*/
function withPopupWindow(block) {
  var win = window.open('', '', 'width=972,height=660,modal=yes,alwaysRaised=yes');
  waitfor {
    try {
      block(url -> win.location.href = url);
    }
    finally {
      win.close();
    }
  }
  or {
    // poll for window close
    while (1) {
      hold(500);
      if (win.closed) {
        return;
      }
    }
  }
}
exports.withPopupWindow = withPopupWindow;


// replace this duck-typed version with a proper type in vm1.js.in 
function isStratum(x) {
 return x && x.abort && x.value && x.waiting;
}

/**
   @function tailspawn
   @param {Function} [f]
   @return {Function}
   @summary A decorator to allow a call to `f` to be tail-replaced with `exp` by calling `return spawn exp` in `f`. This is useful for chaining surface dialogs, and we should eventually have direct syntax support for this in sjs. 
*/
function tailspawn(f) {
  return function() {
    var rv = f.apply(this, arguments);
    if (rv .. isStratum) {
      try {
        return rv.value();
      }
      retract {
        rv.abort();
      }
    }
    else 
      return rv;
  }
}
exports.tailspawn = tailspawn;

//----------------------------------------------------------------------

function PlainTextEditable(elem) {
  // XXX plaintext-only is webkit only
  return elem .. 
    @Attrib('contenteditable', 'plaintext-only') ..
    @Mechanism(function(node) {
      var current_val;
      waitfor {
        // field -> content
        @field.Value() .. @each.track {
          |val|
          if (@eq(val, current_val)) continue;
          current_val = val;
          //console.log("field -> content #{val .. @inspect}");
          // xxx legacy support:
          if (!Array.isArray(val)) val = [val];
          content = val .. @join(`<br>`);
          node .. @replaceContent(content);
        }
      }
      and {
        // content -> field
        @events(node, 'input') .. @each.track {
          |ev|
          var val = node.innerHTML.split('<br>');
          //console.log("content -> field #{val .. @inspect}");
          if (@eq(val, current_val)) continue;
          current_val = val;
          @field.Value().set(val);
        }
      }
    });
}
exports.PlainTextEditable = PlainTextEditable;

//----------------------------------------------------------------------

var popover_CSS_x = {
  'left':   @CSS('{position: absolute; z-index:1000; left:0;}'),
  // XXX TODO 'center'
  'right':  @CSS('{position: absolute; z-index:1000; right:0;}')
};

var popover_CSS_y = {
  'top':    @CSS('{ bottom: 100%; }'),
  'center': @CSS('{ top: 0%; }'),
  'bottom': @CSS('{ top: 100%; }')
};

function popover(anchor, settings, element, block) {
  settings = {
    x: 'left',
    y: 'center'
  } .. @override(settings);

  return anchor .. @appendContent(
    element ..
      popover_CSS_x[settings.x] ..
      popover_CSS_y[settings.y],
    block);
}
exports.popover = popover;

//----------------------------------------------------------------------

var DropdownAnchor_CSS = @CSS('
  {
    cursor: pointer;
  }
');

function waitforClosingClick(elem) {
  waitfor {
    // we wait for clicks during the capture phase, and if they are
    // outside of the menu, we close the menu:
    window .. @events('!click') .. @each {
      |ev|
      var node = ev.target;
      while (node) {
        if (node === elem)
          break;
        node = node.parentNode;
      }
      if (!node) {
        // click is not contained in elem
        ev.stopPropagation();
        ev.preventDefault();
        return;
      }
    }
  }
  or {
    // we wait for bubbling clicks (those that have not been stopped
    // inside the dropdown) and close the menu for those too:
    elem .. @wait('click');
  }
}

function doDropdown(anchor, items) {
  anchor .. popover(
    {x:'right', y:'bottom'},
    @Ul(items) .. @Class('dropdown-menu')
  ) {
    |dropdownDOMElement|
    waitforClosingClick(dropdownDOMElement);
    hold(0); // asynchronize, so that we don't act on propagating clicks again
  }
}

function DropdownMenu(anchor, items) {
  return anchor ..
    DropdownAnchor_CSS ..
    @OnClick(ev -> doDropdown(ev.currentTarget, items));
}
exports.DropdownMenu = DropdownMenu;

//----------------------------------------------------------------------

function fileToDataURL(file) {
  var reader = new FileReader();

  waitfor {
    reader .. @wait('loadend');
    return reader.result;
  }
  and {
    reader.readAsDataURL(file);
  }
  retract {
    reader.abort();
  }
}
exports.fileToDataURL = fileToDataURL;

function fileToArrayBuffer(file) {
  var reader = new FileReader();

  waitfor {
    reader .. @wait('loadend');
    return reader.result;
  }
  and {
    reader.readAsArrayBuffer(file);
  }
  retract {
    reader.abort();
  }
}
exports.fileToArrayBuffer = fileToArrayBuffer;

function VariableApertureStream(arrbuf, settings) {
  settings = {
    min_aperture: 50*1000, // 50kB
    start_aperture: 100*1000, // 100kB
    max_aperture: 5000*1000, // 5MB
    feedback_interval: 2000, // feedback every 2s
    progress_observer: undefined // progress observer
  } .. @override(settings);
  
  var size = arrbuf.byteLength;

  return @Stream ::
    function(receiver) {
      var aperture = settings.start_aperture;
      var written = 0;
      while (written < size) {
        var start = new Date();
        receiver(arrbuf.slice(written, Math.min(written+aperture, size)));
        written += aperture;
        aperture = Math.round(aperture*settings.feedback_interval / (new Date() - start));
        if (aperture < settings.min_aperture) aperture = settings.min_aperture;
        if (aperture > settings.max_aperture) aperture = settings.max_aperture;
        if (settings.progress_observer) {
          settings.progress_observer(written>size ? 100 : Math.floor(written/size*100));
        }
      }
    };
}
exports.VariableApertureStream = VariableApertureStream;

//----------------------------------------------------------------------
// tabs: [{ title, content }]
function TabWidget(tabs) {

  var l = tabs .. @count;
  /* XXX ideally we have width: 100%/l for mobile screens
         and align left for wider screens
  */
  var TabHeaderCSS = @CSS(
    `
    > div {
      display: inline-block;
      line-height: 40px;
      padding: 0 20px;
      white-space: nowrap;
      cursor: pointer;
    }
    > div[active] {
      color: #7E53A3; /* XXX think about style guide system */
      box-shadow: inset 0 -2px 0 currentColor;
    }
    `)

  var ActiveTab = @ObservableVar(0);

  var CmdHandler = @Mechanism(function(node) {
    cmd.stream(['tab']) .. @each {
      |[cmd, param]|
      ActiveTab.set(param);
    }
  });

  var rv =
    @Div ::
    [

      // tab footer
      @Div .. TabHeaderCSS .. @Class('tab-header') .. CmdHandler ::
        tabs ..
          @indexed ..
          @map([i, {title}] -> @Div(title) ..
                                 cmd.Click('tab', i) ..
                                 @Attrib('active', ActiveTab .. @transform(tab -> tab == i))
              ),
      // tab content
      @Div() .. @Class('tab-content') ::
        ActiveTab .. @transform(index -> tabs[index].content)
    ];

  return rv;
}
exports.TabWidget = TabWidget;
