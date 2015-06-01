//
// site.js
//
// the arbor.js website
//
(function($){
  // var trace = function(msg){
  //   if (typeof(window)=='undefined' || !window.console) return
  //   var len = arguments.length, args = [];
  //   for (var i=0; i<len; i++) args.push("arguments["+i+"]")
  //   eval("console.log("+args.join(",")+")")
  // }  
  
  var Renderer = function(elt){
    var dom = $(elt)
    var canvas = dom.get(0)
    var ctx = canvas.getContext("2d");
    var gfx = arbor.Graphics(canvas)
    var sys = null

    var _vignette = null
    var selected = null,
        nearest = null,
        _mouseP = null;

    
    var that = {
      init:function(pSystem){
        sys = pSystem
        sys.screen({size:{width:dom.width(), height:dom.height()},
                    padding:[36,60,36,60]})

        $(window).resize(that.resize)
        that.resize()
        that._initMouseHandling()

        if (document.referrer.match(/echolalia|atlas|halfviz/)){
          // if we got here by hitting the back button in one of the demos, 
          // start with the demos section pre-selected
          that.switchSection('demos')
        }
      },
      resize:function(){
        canvas.width = $(window).width()
        canvas.height = .75* $(window).height()
        sys.screen({size:{width:canvas.width, height:canvas.height}})
        _vignette = null
        that.redraw()
      },
      redraw:function(){
        gfx.clear()
        sys.eachEdge(function(edge, p1, p2){
          if (edge.source.data.alpha * edge.target.data.alpha == 0) return
          gfx.line(p1, p2, {stroke:"#b2b19d", width:2, alpha:edge.target.data.alpha})
        })
        sys.eachNode(function(node, pt){
          var w = Math.max(20, 20+gfx.textWidth(node.name) )
          if (node.data.alpha===0) return
          if (node.data.shape=='dot'){
            gfx.oval(pt.x-w/2, pt.y-w/2, w, w, {fill:node.data.color, alpha:node.data.alpha})
            gfx.text(node.name, pt.x, pt.y+7, {color:"white", align:"center", font:"Helvetica", size:12})
            gfx.text(node.name, pt.x, pt.y+7, {color:"white", align:"center", font:"Helvetica", size:12})
          }else{
            gfx.rect(pt.x-w/2, pt.y-8, w, 20, 4, {fill:node.data.color, alpha:node.data.alpha})
            gfx.text(node.name, pt.x, pt.y+9, {color:"white", align:"center", font:"Helvetica", size:12})
            gfx.text(node.name, pt.x, pt.y+9, {color:"white", align:"center", font:"Helvetica", size:12})
          }
        })
        that._drawVignette()
      },
      
      _drawVignette:function(){
        var w = canvas.width
        var h = canvas.height
        var r = 20

        if (!_vignette){
          var top = ctx.createLinearGradient(0,0,0,r)
          top.addColorStop(0, "#e0e0e0")
          top.addColorStop(.7, "rgba(255,255,255,0)")

          var bot = ctx.createLinearGradient(0,h-r,0,h)
          bot.addColorStop(0, "rgba(255,255,255,0)")
          bot.addColorStop(1, "white")

          _vignette = {top:top, bot:bot}
        }
        
        // top
        ctx.fillStyle = _vignette.top
        ctx.fillRect(0,0, w,r)

        // bot
        ctx.fillStyle = _vignette.bot
        ctx.fillRect(0,h-r, w,r)
      },

      switchMode:function(e){
        if (e.mode=='hidden'){
          dom.stop(true).fadeTo(e.dt,0, function(){
            if (sys) sys.stop()
            $(this).hide()
          })
        }else if (e.mode=='visible'){
          dom.stop(true).css('opacity',0).show().fadeTo(e.dt,1,function(){
            that.resize()
          })
          if (sys) sys.start()
        }
      },
      
      switchSection:function(newSection){
        var parent = sys.getEdgesFrom(newSection)[0].source
        var children = $.map(sys.getEdgesFrom(newSection), function(edge){
          return edge.target
        })
        
        sys.eachNode(function(node){
          if (node.data.shape=='dot') return // skip all but leafnodes

          var nowVisible = ($.inArray(node, children)>=0)
          var newAlpha = (nowVisible) ? 1 : 0
          var dt = (nowVisible) ? .5 : .5
          sys.tweenNode(node, dt, {alpha:newAlpha})

          if (newAlpha==1){
            node.p.x = parent.p.x + .05*Math.random() - .025
            node.p.y = parent.p.y + .05*Math.random() - .025
            node.tempMass = .001
          }
        })
      },
      
      
      _initMouseHandling:function(){
        // no-nonsense drag and drop (thanks springy.js)
        selected = null;
        nearest = null;
        var dragged = null;
        var oldmass = 1

        var _section = null

        var handler = {
          moved:function(e){
            var pos = $(canvas).offset();
            _mouseP = arbor.Point(e.pageX-pos.left, e.pageY-pos.top)
            nearest = sys.nearest(_mouseP);

            if (!nearest.node) return false

            // if (nearest.node.data.shape!='dot'){
            //   selected = (nearest.distance < 50) ? nearest : null
            //   if (selected){
            //      dom.addClass('linkable')
            //      window.status = selected.node.data.link.replace(/^\//,"http://"+window.location.host+"/").replace(/^#/,'')
            //   }
            //   else{
            //      dom.removeClass('linkable')
            //      window.status = ''
            //   }
            //}else 
            // if ($.inArray(nearest.node.name, ['Innovation','pushes humanity forward','is everywhere','needs action']) >=0 ){
            //   if (nearest.node.name!=_section){
            //     _section = nearest.node.name
            //     that.switchSection(_section)
            //   }
            //   dom.removeClass('linkable')
            //   window.status = ''
            // }
            
            return false
          },
          clicked:function(e){
            var pos = $(canvas).offset();
            _mouseP = arbor.Point(e.pageX-pos.left, e.pageY-pos.top)
            nearest = dragged = sys.nearest(_mouseP);
            
            if (nearest && selected && nearest.node===selected.node){
              var link = selected.node.data.link
              if (link.match(/^#/)){
                 $(that).trigger({type:"navigate", path:link.substr(1)})
              }else{
                 window.location = link
              }
              return false
            }
            
            
            if (dragged && dragged.node !== null) dragged.node.fixed = true

            $(canvas).unbind('mousemove', handler.moved);
            $(canvas).bind('mousemove', handler.dragged)
            $(window).bind('mouseup', handler.dropped)

            return false
          },
          dragged:function(e){
            var old_nearest = nearest && nearest.node._id
            var pos = $(canvas).offset();
            var s = arbor.Point(e.pageX-pos.left, e.pageY-pos.top)

            if (!nearest) return
            if (dragged !== null && dragged.node !== null){
              var p = sys.fromScreen(s)
              dragged.node.p = p
            }

            return false
          },

          dropped:function(e){
            if (dragged===null || dragged.node===undefined) return
            if (dragged.node !== null) dragged.node.fixed = false
            dragged.node.tempMass = 1000
            dragged = null;
            // selected = null
            $(canvas).unbind('mousemove', handler.dragged)
            $(window).unbind('mouseup', handler.dropped)
            $(canvas).bind('mousemove', handler.moved);
            _mouseP = null
            return false
          }


        }

        $(canvas).mousedown(handler.clicked);
        $(canvas).mousemove(handler.moved);

      }
    }
    
    return that
  }
  
  
  var Nav = function(elt){
    var dom = $(elt)

    var _path = null
    
    var that = {
      init:function(){
        $(window).bind('popstate',that.navigate)
        dom.find('> a').click(that.back)
        $('.more').one('click',that.more)
        
        $('#docs dl:not(.datastructure) dt').click(that.reveal)
        that.update()
        return that
      },
      more:function(e){
        $(this).removeAttr('href').addClass('less').html('&nbsp;').siblings().fadeIn()
        $(this).next('h2').find('a').one('click', that.less)
        
        return false
      },
      less:function(e){
        var more = $(this).closest('h2').prev('a')
        $(this).closest('h2').prev('a')
        .nextAll().fadeOut(function(){
          $(more).text('creation & use').removeClass('less').attr('href','#')
        })
        $(this).closest('h2').prev('a').one('click',that.more)
        
        return false
      },
      reveal:function(e){
        $(this).next('dd').fadeToggle('fast')
        return false
      },
      back:function(){
        _path = "/"
        if (window.history && window.history.pushState){
          window.history.pushState({path:_path}, "", _path);
        }
        that.update()
        return false
      },
      navigate:function(e){
        var oldpath = _path
        if (e.type=='navigate'){
          _path = e.path
          if (window.history && window.history.pushState){
             window.history.pushState({path:_path}, "", _path);
          }else{
            that.update()
          }
        }else if (e.type=='popstate'){
          var state = e.originalEvent.state || {}
          _path = state.path || window.location.pathname.replace(/^\//,'')
        }
        if (_path != oldpath) that.update()
      },
      update:function(){
        var dt = 'fast'
        if (_path===null){
          // this is the original page load. don't animate anything just jump
          // to the proper state
          _path = window.location.pathname.replace(/^\//,'')
          dt = 0
          dom.find('p').css('opacity',0).show().fadeTo('slow',1)
        }

        switch (_path){
          case '':
          case '/':
          dom.find('p').text('a graph visualization library using web workers and jQuery')
          dom.find('> a').removeClass('active').attr('href','#')

          $('#docs').fadeTo('fast',0, function(){
            $(this).hide()
            $(that).trigger({type:'mode', mode:'visible', dt:dt})
          })
          document.title = "arbor.js"
          break
          
          case 'introduction':
          case 'without warning':
          $(that).trigger({type:'mode', mode:'hidden', dt:dt})
          dom.find('> p').text(_path)
          dom.find('> a').addClass('active').attr('href','#')
          $('#docs').stop(true).css({opacity:0}).show().delay(333).fadeTo('fast',1)
                    
          $('#docs').find(">div").hide()
          $('#docs').find('#'+_path).show()
          document.title = "arbor.js Â» " + _path
          break
        }
        
      }
    }
    return that
  }
  
  $(document).ready(function(){
    var COLOR = {
      main:"#C7F464",
      second:"#FF6B6B",
      third:"#C44D58",
      fourth:"#556270",
      fifth:"#4ECDC4"
    }

    var theUI = {
      nodes:{"Innovation":{color:COLOR.fifth, shape:"dot", mass:5, fixed: true, alpha:1}, 
      
             "is everywhere":{color:COLOR.main, shape:"dot", alpha:1}, 
                "clothes":{color:COLOR.fourth, alpha:1, link:''},
                "pens":{color:COLOR.fourth, alpha:1, link:''},
                "phones":{color:COLOR.fourth, alpha:1, link:''},
                "glasses":{color:COLOR.fourth, alpha:1, link:''},

            "is the source to solve all problems":{color:COLOR.second},
            "and to find new ones":{color:COLOR.third},

            "problems make innovation":{color:COLOR.second},
            "tsunamis":{color:COLOR.fourth},
            "scary and inescapable at first":{color:COLOR.third},
            "force to improve or start from scratch":{color:COLOR.third},
            "build things in new dimensions":{color:COLOR.second},






            "builds upon innovation":{color:COLOR.second},
            "making things incrementally better":{color:COLOR.third},
            "until they're something completely different":{color:COLOR.third},

            "innovators stand on the shoulders of innovators":{color:COLOR.third},
             "pushes humanity forward":{color:COLOR.main, shape:"dot", alpha:1},
             "steadily fabricates our world":{color:COLOR.second, alpha:1},
             "the world is a LEGO playground":{color:COLOR.second},
              "an idea is the beginning of taking humans to the moon":{color:COLOR.second, alpha:1},


              "mathematical equation":{color:COLOR.fourth},
              "launching rockets to space":{color:COLOR.fourth},

              "boolean logic":{color:COLOR.fourth},
              "computers":{color:COLOR.fourth},
              "artificial intelligence":{color:COLOR.fourth},
              "computer games":{color:COLOR.fourth},
              "imagined worlds":{color:COLOR.fourth},


              "something in a person's mind can be suddenly on his hands":{color:COLOR.second},
              "building the world is transforming thoughts into reality":{color:COLOR.third},




              "everything is":{color:COLOR.second},
              "ideas are all it takes to start":{color:COLOR.second, alpha:1},
              "building":{color:COLOR.fourth, alpha:1},
              "creating":{color:COLOR.fourth, alpha:1},
              "transforming":{color:COLOR.fourth, alpha:1},
              "redefining":{color:COLOR.fourth, alpha:1},
              "our universe":{color:COLOR.third, alpha:1},


             "needs action":{color:COLOR.main, shape:"dot", alpha:1},
             "nothing has ever happened without":{color:COLOR.second},
             "doing":{color:COLOR.fourth},
             "execution":{color:COLOR.fourth},
             "exertion":{color:COLOR.fourth},
             "some force":{color:COLOR.fourth},

             "infinite ways to innovate and even more things to innovate":{color:COLOR.third, alpha:1, link:''},

             "arises while":{color:COLOR.third, alpha:1, link:''},
                "brainstorming":{color:COLOR.fourth, alpha:1, link:''},
                "discussing":{color:COLOR.fourth, alpha:1, link:''},
                "fighting":{color:COLOR.fourth, alpha:1, link:''},
                "complimenting":{color:COLOR.fourth, alpha:1, link:''},
                "taking a shower":{color:COLOR.fourth, alpha:1, link:''},

             "without warning":{color:COLOR.second, alpha:1}, 
             "is this arrangement of words":{color:COLOR.third, alpha:1}
            },
      edges:{
        "Innovation":{
          "is everywhere":{length:.8},
          "pushes humanity forward":{length:.8},
          "needs action":{length:.8},

          "is the source to solve all problems":{},
          "builds upon innovation":{}
        },

        "builds upon innovation":{
          "making things incrementally better":{},
          "innovators stand on the shoulders of innovators":{},
           "boolean logic":{},
           "mathematical equation":{}
        },
        "problems make innovation":{
          "and to find new ones":{},
          "tsunamis":{}
        },
        "scary and inescapable at first":{
            "tsunamis":{},
            "problems make innovation":{},
            "force to improve or start from scratch":{}
          },

          "force to improve or start from scratch":{
            "build things in new dimensions":{},
            "tsunamis":{}
          },
          "build things in new dimensions":{
            "the world is a LEGO playground":{}
          },



          "boolean logic":{"computers":{}},
          "computers":{"artificial intelligence":{}},
          "artificial intelligence":{"computer games":{}},
          "computer games":{"imagined worlds":{}},
          "imagined worlds":{"the world is a LEGO playground":{}},


          "mathematical equation":{"launching rockets to space":{}},
          "launching rockets to space":{
            "an idea is the beginning of taking humans to the moon":{}},


          "making things incrementally better":{
            "until they're something completely different":{},
            "steadily fabricates our world":{}
          },

        "is everywhere":{
               "without warning":{},
               "infinite ways to innovate and even more things to innovate":{},
               "arises while":{},
               "pens":{},
               "clothes":{},
               "phones":{},
               "glasses":{},
               "is the source to solve all problems":{},
               "builds upon innovation":{}
        }, "is the source to solve all problems":{
                "and to find new ones":{} 
            },
          "steadily fabricates our world":{
              "Innovation":{},
              "the world is a LEGO playground":{}
          },
        "arises while":{
                "Innovation":{},
               "brainstorming":{},
               "discussing":{},
               "fighting":{},
              "complimenting":{},
               "taking a shower":{}
        },
        "without warning":{
              "is this arrangement of words":{}
        },
        "building the world is transforming thoughts into reality":{
        "the world is a LEGO playground":{},
        "steadily fabricates our world":{}
        },
        "needs action":{
          "nothing has ever happened without":{},
          "something in a person's mind can be suddenly on his hands":{}
        },
        "something in a person's mind can be suddenly on his hands":{
          "building the world is transforming thoughts into reality":{}
        },
        "nothing has ever happened without":{
           "doing":{color:COLOR.fourth},
             "execution":{color:COLOR.fourth},
             "exertion":{color:COLOR.fourth},
             "some force":{color:COLOR.fourth},
        },

        "pushes humanity forward":{
              "an idea is the beginning of taking humans to the moon":{},
              "ideas are all it takes to start":{},
              "the world is a LEGO playground":{}
        },
        "infinite ways to innovate and even more things to innovate":{
          "redefining":{length:1.8}
        },
        "ideas are all it takes to start":{
          "building":{},
          "creating":{},
          "transforming":{},
          "redefining":{}
        },
        "everything is":{
          "building":{},
          "creating":{},
          "transforming":{},
          "redefining":{}
        },
        "our universe":{
          "building":{},
          "creating":{},
          "transforming":{},
          "redefining":{}
        },
        "is this arrangement of words":{
              "Innovation":{}
        }
      }
    }


    var sys = arbor.ParticleSystem()
    sys.parameters({stiffness:0, repulsion:300, gravity:false, dt:0.005})
    sys.renderer = Renderer("#sitemap")
    sys.graft(theUI)
    
    var nav = Nav("#nav")
    $(sys.renderer).bind('navigate', nav.navigate)
    $(nav).bind('mode', sys.renderer.switchMode)
    nav.init()
  })
})(this.jQuery)
