// 1. notebook change
// notebook一改变, 当前的肯定要保存, ajax是异步的. 此时先清空所有note信息. -> 得到该notebook的notes, 显示出来, 并选中第一个!
// 在这期间定时器还会保存, curNoteId还没换, 所以会清空curNoteId的content!!!

// 2. note change, save cur, 立即curNoteId = ""!!

// 3. 什么时候设置curNoteId? 是ajax得到内容之后设置

// note
Note.curNoteId = "";

Note.interval = ""; // 定时器

Note.itemIsBlog = '<div class="item-blog"><i class="fa fa-bold" title="blog"></i></div><div class="item-setting"><i class="fa fa-cog" title="setting"></i></div>';
// for render
Note.itemTplNoImg = '<li href="#" class="item ?" noteId="?">'
Note.itemTplNoImg += Note.itemIsBlog +'<div class="item-desc"><p class="item-title">?</p><p class="item-info"><i class="fa fa-book"></i> <span class="note-notebook">?</span> <i class="fa fa-clock-o"></i> <span class="updated-time">?</span></p><p class="desc">?</p></div></li>';

// 有image
Note.itemTpl = '<li href="#" class="item ? item-image" noteId="?"><div class="item-thumb" style=""><img src="?"/></div>'
Note.itemTpl +=Note.itemIsBlog + '<div class="item-desc" style=""><p class="item-title">?</p><p class="item-info"><i class="fa fa-book"></i> <span class="note-notebook">?</span> <i class="fa fa-clock-o"></i> <span class="updated-time">?</span></p><p class="desc">?</p></div></li>';

// for new
Note.newItemTpl = '<li href="#" class="item item-active ?" fromUserId="?" noteId="?">'
Note.newItemTpl += Note.itemIsBlog + '<div class="item-desc" style="right: 0px;"><p class="item-title">?</p><p class="item-text"><i class="fa fa-book"></i> <span class="note-notebook">?</span> <i class="fa fa-clock-o"></i> <span class="updated-time">?</span><br /><span class="desc">?</span></p></div></li>';

Note.noteItemListO = $("#noteItemList");

// notbeookId => {"updatedTime" => [noteId1, noteId2], "title" => [noteId1, noteId2...]} 排序方式分组
// 一旦某notebook改变了就清空, 重新排序之. (用js排)
Note.cacheByNotebookId = {all: {}};
Note.notebookIds = {}; // notebookId => true

Note.isReadOnly = false;
// 定时保存信息
Note.intervalTime = 600000; // 600s, 10mins
Note.startInterval = function() {
	Note.interval = setInterval(function() {
		log("自动保存开始...")
		changedNote = Note.curChangedSaveIt(false);
	}, Note.intervalTime); // 600s, 10mins
}
// 停止, 当切换note时
// 但过5000后自动启动
Note.stopInterval = function() {
	clearInterval(Note.interval);
	
	setTimeout(function() {
		Note.startInterval();
	}, Note.intervalTime);
}

// note = {NoteId, Desc, UserId,...}
Note.addNoteCache = function(note) {
	Note.cache[note.NoteId] = note;
	Note.clearCacheByNotebookId(note.NotebookId);
}
// content = {NoteId:, Content:}
// 还可以设置其它的值
Note.setNoteCache = function(content, clear) {
	if(!Note.cache[content.NoteId]) {
		 Note.cache[content.NoteId] = content;
	} else {
		$.extend(Note.cache[content.NoteId], content);
	}
	
	if(clear == undefined) {
		clear = true;
	}
	if(clear) {
		Note.clearCacheByNotebookId(content.NotebookId);
	}
}

// 得到当前的笔记
Note.getCurNote = function() {
	var self = this;
	if(self.curNoteId == "") {
		return null;
	}
	return self.cache[self.curNoteId];
}
Note.getNote = function(noteId) {
	var self = this;
	return self.cache[noteId];
}

// 每当有notebookId相应的note改变时都要重新清空之
// 并设置该notebookId有值
Note.clearCacheByNotebookId = function(notebookId) {
	if(notebookId) {
		Note.cacheByNotebookId[notebookId] = {};
		Note.cacheByNotebookId["all"] = {};
		Note.notebookIds[notebookId] = true;
	}
}

// notebook是否有notes
// called by Notebook
Note.notebookHasNotes = function(notebookId) {
	var notes = Note.getNotesByNotebookId(notebookId);
	return !isEmpty(notes);
}

// 得到notebook下的notes, 按什么排序 updatedTime?
Note.getNotesByNotebookId = function(notebookId, sortBy, isAsc) {
	if(!sortBy) {
		sortBy = "UpdatedTime";
	}
	if(isAsc == "undefined") {
		isAsc = false; // 默认是降序
	}
	
	if(!notebookId) {
		notebookId = "all";
	}
	
	if(!Note.cacheByNotebookId[notebookId]) {
		return [];
	}
	
	if(Note.cacheByNotebookId[notebookId][sortBy]) {
		return Note.cacheByNotebookId[notebookId][sortBy];
	} else {
	}
	
	// 从所有的notes中找到notebookId的, 并排序之
	var notes = [];
	var sortBys = [];
	for(var i in Note.cache) {
		if(!i) {
			continue;
		}
		var note = Note.cache[i];
		// 不要trash的not, 共享的也不要
		if(note.IsTrash || note.IsShared) {
			continue;
		}
		if(notebookId == "all" || note.NotebookId == notebookId) {
			notes.push(note);
		}
	}
	// 排序之
	notes.sort(function(a, b) {
		var t1 = a[sortBy];
		var t2 = b[sortBy];
		
		if(isAsc) {
			if(t1 < t2) {
				return -1;
			} else if (t1 > t2) {
				return 1;
			}	
		} else {
			if(t1 < t2) {
				return 1;
			} else if (t1 > t2) {
				return -1;
			}
		}
		return 0;
	});
	
	// 缓存之
	Note.cacheByNotebookId[notebookId][sortBy] = notes;
	return notes;
};

// 该笔记点击后已污染
Note.curNoteIsDirtied = function() {
	var me = this;
	var note = me.getCurNote();
	if(note) {
		note.isDirty = true;
	}
};

// called by Notebook
// render 所有notes, 和第一个note的content
Note.renderNotesAndFirstOneContent = function(ret) {
	// 错误的ret是一个Object
	if(!isArray(ret)) {
		return;
	}
	
	// note 导航
	Note.renderNotes(ret);
	// 渲染第一个
	if(!isEmpty(ret[0])) {
		Note.changeNoteForPjax(ret[0].NoteId, true, false);
	} else {
	}
}

// 当前的note是否改变过了?
// 返回已改变的信息
// force bool true表示content比较是比较HTML, 否则比较text, 默认为true
// 定时保存用false
Note.curHasChanged = function(force) {
	if(force == undefined) {
		force = true;
	}
	var cacheNote = Note.cache[Note.curNoteId] || {};
	// 收集当前信息, 与cache比对
	var title = $("#noteTitle").val();
	var tags = Tag.getTags(); // TODO
	
	// 如果是markdown返回[content, preview]
	var contents = getEditorContent(cacheNote.IsMarkdown);
	var content, preview;
	var contentText;
	if (isArray(contents)) {
		content = contents[0];
		preview = contents[1];
		contentText = content;
		// preview可能没来得到及解析
		if (content && previewIsEmpty(preview) && Converter) {
			preview = Converter.makeHtml(content);
		}
		if(!content) {
			preview = "";
		}
		cacheNote.Preview = preview; // 仅仅缓存在前台
	} else {
		content = contents;
		try {
			contentText = $(content).text();
		} catch(e) {
		}
	}
	
	var hasChanged = {
		hasChanged: false, // 总的是否有改变
		IsNew: cacheNote.IsNew, // 是否是新添加的
		IsMarkdown: cacheNote.IsMarkdown, // 是否是markdown笔记
		FromUserId: cacheNote.FromUserId, // 是否是共享新建的
		NoteId: cacheNote.NoteId,
		NotebookId: cacheNote.NotebookId,
		Version: cacheNote.Version || 0, // 版本控制
	};
	
	if(hasChanged.IsNew) {
		$.extend(hasChanged, cacheNote);
	} else {
		if(!cacheNote.isDirty) {
			log("no dirty");
			hasChanged.hasChanged = false;
			return hasChanged;
		}
	}
	
	if(cacheNote.Title != title) {
		hasChanged.hasChanged = true; // 本页使用用小写
		hasChanged.Title = title; // 要传到后台的用大写
		if(!hasChanged.Title) {
//			alert(1);
		}
	}
	
	if(!arrayEqual(cacheNote.Tags, tags)) {
		hasChanged.hasChanged = true;
		hasChanged.Tags = tags.join(","); // 为什么? 因为空数组不会传到后台
	}
	
	// 比较text, 因为note Nav会添加dom会导致content改变
	if((force && cacheNote.Content != content) || (!force && (/**/(!cacheNote.IsMarkdown && $(cacheNote.Content).text() != contentText) || (cacheNote.IsMarkdown && cacheNote.Content != contentText)) /**/) ) {
		hasChanged.hasChanged = true;
		hasChanged.Content = content;
		
		// 从html中得到...
		var c = preview || content;
		
		// 不是博客或没有自定义设置的
		if(!cacheNote.HasSelfDefined || !cacheNote.IsBlog) {
			hasChanged.Desc = Note.genDesc(c);
			hasChanged.ImgSrc = Note.getImgSrc(c);
			hasChanged.Abstract = Note.genAbstract(c);
		}
	} else {
		log("text相同");
		log(cacheNote.Content == content);
	}
	
	hasChanged["UserId"] = cacheNote["UserId"] || "";
	
	return hasChanged;
}

// 由content生成desc
// 换行不要替换
Note.genDesc = function(content) {
	if(!content) {
		return "";
	}
	
	// 将</div>, </p>替换成\n
	/*
	var token = "ALEALE";
	content = content.replace(/<\/p>/g, token); 
	content = content.replace(/<\/div>/g, token);
	content = content.replace(/<\/?.+?>/g," ");
	
	pattern = new RegExp(token, "g");
	content = content.replace(pattern, "<br />");
	content = content.replace(/<br \/>( *)<br \/>/g, "<br />"); // 两个<br />之间可能有空白
	content = content.replace(/<br \/>( *)<br \/>/g, "<br />");
	
	// 去掉最开始的<br />或<p />
	content = trimLeft(content, " ");
	content = trimLeft(content, "<br />");
	content = trimLeft(content, "</p>");
	content = trimLeft(content, "</div>");
	*/
	
	// 留空格
	content = content.replace(/<br \/>/g," <br />");
	content = content.replace(/<\/p>/g," </p>");
	content = content.replace(/<\/div>/g," </div>");
	
	// 避免其它的<img 之类的不完全
	content = $("<div></div>").html(content).text();
	
	
	// pre下text()会将&lt; => < &gt; => >
	content = content.replace(/</g, "&lt;");
	content = content.replace(/>/g, "&gt;");
	
	if(content.length < 300) {
		return content;
	}
	return content.substring(0, 300);
}

// 得到摘要
Note.genAbstract = function(content, len) {
	if(!content) {
		return "";
	}
	if(len == undefined) {
		len = 1000;
	}
	if(content.length < len) {
		return content;
	}
	var isCode = false;
	var isHTML = false;
	var n = 0;
	var result = "";
	var maxLen = len;
	for(var i = 0; i < content.length; ++i) {
		var temp = content[i]
		if (temp == '<') {
			isCode = true
		} else if (temp == '&') {
			isHTML = true
		} else if (temp == '>' && isCode) {
			n = n - 1
			isCode = false
		} else if (temp == ';' && isHTML) {
			isHTML = false
		}
		if (!isCode && !isHTML) {
			n = n + 1
		}
		result += temp
		if (n >= maxLen) {
			break
		}
	}
	
	var d = document.createElement("div");
    d.innerHTML = result
    return d.innerHTML;
}

Note.getImgSrc = function(content) {
	if(!content) {
		return "";
	}
	var imgs = $(content).find("img");
	for(var i in imgs) {
		var src = imgs.eq(i).attr("src");
		if(src) {
			return src;
		}
	}
	return "";
}

// 如果当前的改变了, 就保存它
// 以后要定时调用
// force , 默认是true, 表强校验内容
// 定时保存传false
Note.saveInProcess = {}; // noteId => bool, true表示该note正在保存到服务器, 服务器未响应
Note.savePool = {}; // 保存池, 以后的保存先放在pool中, id => note
Note.curChangedSaveIt = function(force, callback) {
	var me = this;
	// 如果当前没有笔记, 不保存
	if(!Note.curNoteId || Note.isReadOnly) {
		return;
	}
	
	var hasChanged = Note.curHasChanged(force);
	
	if(hasChanged.hasChanged || hasChanged.IsNew) {
		// 把已改变的渲染到左边 item-list
		Note.renderChangedNote(hasChanged);
		delete hasChanged.hasChanged;
		
		// 表示有未完成的保存
		/*
		if(me.saveInProcess[hasChanged.NoteId]) {
			log("in process");
			me.savePool[hasChanged.NoteId] = hasChanged;
			me.startUpdatePoolNoteInterval();
			return;
		}
		*/
		
		// 保存之
		showMsg(getMsg("saving"));
		
		me.saveInProcess[hasChanged.NoteId] = true;
		
		ajaxPost("/note/updateNoteOrContent", hasChanged, function(ret) {
			me.saveInProcess[hasChanged.NoteId] = false;
			if(hasChanged.IsNew) {
				// 缓存之, 后台得到其它信息
				ret.IsNew = false;
				Note.setNoteCache(ret, false);

				// 新建笔记也要change history
				Pjax.changeNote(ret);
			}
			callback && callback();
			showMsg(getMsg("saveSuccess"), 1000);
		});
		
		if(hasChanged['Tags'] != undefined && typeof hasChanged['Tags'] == 'string') {
			hasChanged['Tags'] = hasChanged['Tags'].split(',');
		}
		// 先缓存, 把markdown的preview也缓存起来
		Note.setNoteCache(hasChanged, false);
		// 设置更新时间
		Note.setNoteCache({"NoteId": hasChanged.NoteId, "UpdatedTime": (new Date()).format("yyyy-MM-ddThh:mm:ss.S")}, false);
		
		return hasChanged;
	}
	return false;
};

// 更新池里的笔记
Note.updatePoolNote = function() {
	var me = this;
	for(var noteId in me.savePool) {
		if(!noteId) {
			continue;
		}
		// 删除之
		delete me.savePool[noteId];
		var hasChanged = me.savePool[noteId];
		me.saveInProcess[noteId] = true;
		ajaxPost("/note/updateNoteOrContent", hasChanged, function(ret) {
			me.saveInProcess[noteId] = false;
		});
	}
};
// 启动保存, 暂不处理
Note.updatePoolNoteInterval = null;
Note.startUpdatePoolNoteInterval = function() {
	return;
	var me = this;
	if(me.updatePoolNoteInterval) {
		return;
	}
	me.updatePoolNoteInterval = setTimeout(function() { 
		log('update pool');
		me.updatePoolNote();
	}, 1000);
};


// 样式
Note.selectTarget = function(target) {
	$(".item").removeClass("item-active");
	$(target).addClass("item-active");
}

// 改变note
// 可能改变的是share note
// 1. 保存之前的note
// 2. ajax得到现在的note
Note.showContentLoading = function() {
	$("#noteMaskForLoading").css("z-index", 99999);
};
Note.hideContentLoading = function() {
	$("#noteMaskForLoading").css("z-index", -1);
};

Note.directToNote = function(noteId) {
	var $p = $("#noteItemList");
	var pHeight = $p.height();
	// 相对于父亲的位置
	var pTop = $("[noteId='" + noteId + "']").position().top;
	var scrollTop = $p.scrollTop();
	pTop += scrollTop;
	/*
	log("..");
	log(noteId);
	log(pTop + ' ' + pHeight + ' ' + scrollTop);
	*/
	
	// 当前的可视范围的元素位置是[scrollTop, pHeight + scrollTop]
	if(pTop >= scrollTop && pTop <= pHeight + scrollTop) {
	} else {
		var top = pTop;
		log("定位到特定note, 在可视范围内");
		// 手机不用slimScroll
		if(!LEA.isMobile && !Mobile.isMobile()) {
			$("#noteItemList").scrollTop(top);
			$("#noteItemList").slimScroll({ scrollTo: top + 'px', height: "100%", onlyScrollBar: true});
		} else {
		}
	}
};

// mustPush表示是否将状态push到state中, 默认为true
// 什么时候为false, 在popstate时
// needTargetNobook默认为false, 在点击notebook, renderfirst时为false
Note.changeNoteForPjax = function(noteId, mustPush, needTargetNotebook) {
	var me = this;
	var note = me.getNote(noteId);
	if(!note) {
		return;
	}
	var isShare = note.Perm != undefined;
	if(needTargetNotebook == undefined) {
		needTargetNotebook = true;
	}
	me.changeNote(noteId, isShare, true, function(note) {
		// push state
		if(mustPush == undefined) {
			mustPush = true;
		}
		if(mustPush) {
			Pjax.changeNote(note);
		}
		
		// popstate时虽然选中了note, 但位置可能不可见
		if(needTargetNotebook) {
			Note.directToNote(noteId);
		}
	});
	
	// 第一次render时定位到第一个笔记的notebook 12.06 life
	// 或通过pop时
	// 什么时候需要? 1. 第一次changeNote, 2. pop时, 只有当点击了notebook后才不要
	
	// 这里, 万一是共享笔记呢?
	// 切换到共享中
	if(needTargetNotebook) {
		if(isShare) {
			if($("#myShareNotebooks").hasClass("closed")) {
				$("#myShareNotebooks .folderHeader").trigger("click");
			}
		} else {
			if($("#myNotebooks").hasClass("closed")) {
				$("#myNotebooks .folderHeader").trigger("click");
			}
		}
		// 如果是子笔记本, 那么要展开父笔记本
		Notebook.expandNotebookTo(note.NotebookId);
	}
};

// 点击notebook时调用, 渲染第一个笔记
Note.contentAjax = null;
Note.contentAjaxSeq = 1;
Note.changeNote = function(selectNoteId, isShare, needSaveChanged, callback) {
	var self = this;
	
	// -1 停止定时器
	Note.stopInterval();
	
	// 0
	var target = $(tt('[noteId="?"]', selectNoteId))
	Note.selectTarget(target);
	
	// 1 之前的note, 判断是否已改变, 改变了就要保存之
	// 这里, 在搜索的时候总是保存, 搜索的话, 比较快, 肯定没有变化, 就不要执行该操作
	if(needSaveChanged == undefined) {
		needSaveChanged  = true;
	}
	if(needSaveChanged) {
		var changedNote = Note.curChangedSaveIt();
	}
	
	// 2. 设空, 防止在内容得到之前又发生保存
	Note.curNoteId = "";
	
	// 2 得到现在的
	// ajax之
	var cacheNote = Note.cache[selectNoteId];
	
	// 判断是否是共享notes
	if(!isShare) {
		if(cacheNote.Perm != undefined) {
			isShare = true;
		}
	}
	var hasPerm = !isShare || Share.hasUpdatePerm(selectNoteId); // 不是共享, 或者是共享但有权限
	
	// 有权限
	if(hasPerm) {
		Note.hideReadOnly();
		Note.renderNote(cacheNote);
	} else {
		Note.renderNoteReadOnly(cacheNote);
	}
	
	// 这里要切换编辑器
	switchEditor(cacheNote.IsMarkdown)
	
	Attach.renderNoteAttachNum(selectNoteId, true);
	
	Note.contentAjaxSeq++;
	var seq = Note.contentAjaxSeq;
	function setContent(ret) {
		Note.contentAjax = null;
		if(seq != Note.contentAjaxSeq) {
			return;
		}
		Note.setNoteCache(ret, false);
		// 把其它信息也带上
		ret = Note.cache[selectNoteId]
		
		Note.renderNoteContent(ret);
		/* 都用editable的render
		if(hasPerm) {
			Note.renderNoteContent(ret);
		} else {
			Note.renderNoteContentReadOnly(ret);
		}
		*/
		self.hideContentLoading();
		
		callback && callback(ret);
	}
	
	if(cacheNote.Content) {
		setContent(cacheNote);
		return;
	}
	
	var url = "/note/getNoteContent";
	var param = {noteId: selectNoteId};
	if(isShare) {
		url = "/share/getShareNoteContent";
		param.sharedUserId = cacheNote.UserId // 谁的笔记
	}
	
	self.showContentLoading();
	if(Note.contentAjax != null) {
		Note.contentAjax.abort();
	}
	Note.contentAjax = ajaxGet(url, param, setContent);
}

// 渲染

// 更改信息到左侧
// 定时更改 当前正在编辑的信息到左侧导航
// 或change select. 之前的note, 已经改变了
Note.renderChangedNote = function(changedNote) {
	if(!changedNote) {
		return;
	}
	
	// 找到左侧相应的note
	var $leftNoteNav = $(tt('[noteId="?"]', changedNote.NoteId));
	if(changedNote.Title) {
		$leftNoteNav.find(".item-title").html(changedNote.Title);
	}
	if(changedNote.Desc) {
		$leftNoteNav.find(".desc").html(changedNote.Desc);
	}
	if(changedNote.ImgSrc) {
		$thumb = $leftNoteNav.find(".item-thumb");
		// 有可能之前没有图片
		if($thumb.length > 0) {
			$thumb.find("img").attr("src", changedNote.ImgSrc);
		} else {
			$leftNoteNav.append(tt('<div class="item-thumb" style=""><img src="?"></div>', changedNote.ImgSrc));
			$leftNoteNav.addClass("item-image");
		}
		$leftNoteNav.find(".item-desc").removeAttr("style");
	} else if(changedNote.ImgSrc == "") {
		$leftNoteNav.find(".item-thumb").remove(); // 以前有, 现在没有了
		$leftNoteNav.removeClass("item-image");
	}
}

// 清空右侧note信息, 可能是共享的, 
// 此时需要清空只读的, 且切换到note edit模式下
Note.clearNoteInfo = function() {
	Note.curNoteId = "";
	Tag.clearTags();
	$("#noteTitle").val("");
	setEditorContent("");
	
	// markdown editor
	/*
	$("#wmd-input").val("");
	$("#wmd-preview").html("");
	*/
	
	// 只隐藏即可
	$("#noteRead").hide();
}
// 清除noteList导航
Note.clearNoteList = function() {
	Note.noteItemListO.html(""); // 清空
}

// 清空所有, 在转换notebook时使用
Note.clearAll = function() {
	// 当前的笔记清空掉
	Note.curNoteId = "";
	
	Note.clearNoteInfo();
	Note.clearNoteList();
}

Note.renderNote = function(note) {
	if(!note) {
		return;
	}
	// title
	$("#noteTitle").val(trimTitle(note.Title));
	
	// 当前正在编辑的
	// tags
	Tag.renderTags(note.Tags);
	
	// 笔记是新render的, 没有污染过
	note.isDirty = false;
}

// render content
Note.renderNoteContent = function(content) {
	setEditorContent(content.Content, content.IsMarkdown, content.Preview, function() {
		Note.curNoteId = content.NoteId;
		Note.toggleReadOnly();
	});
	// 只有在renderNoteContent时才设置curNoteId
	Note.curNoteId = content.NoteId;
}

// 初始化时渲染最初的notes
/**
    <div id="noteItemList">
	  <!--
      <div href="#" class="item">
        <div class="item-thumb" style="">
          <img src="images/a.gif"/>
        </div>

        <div class="item-desc" style="">
            <p class="item-title">?</p>
            <p class="item-text">
            	?
            </p>
        </div>
      </div>
      -->
*/

Note.showEditorMask = function() {
	$("#editorMask").css("z-index", 10).show();
	// 要判断是否是垃圾筒
	if(Notebook.curNotebookIsTrashOrAll()) {
		$("#editorMaskBtns").hide();
		$("#editorMaskBtnsEmpty").show();
	} else {
		$("#editorMaskBtns").show();
		$("#editorMaskBtnsEmpty").hide();
	}
}
Note.hideEditorMask = function() {
	$("#editorMask").css("z-index", -10).hide();
}

// 这里如果notes过多>100个将会很慢!!, 使用setTimeout来分解
Note.renderNotesC = 0;
Note.renderNotes = function(notes, forNewNote, isShared) {
	var renderNotesC = ++Note.renderNotesC;
	
	// 手机端不用
	// slimScroll使得手机端滚动不流畅
	if(!LEA.isMobile && !Mobile.isMobile()) {
		$("#noteItemList").slimScroll({ scrollTo: '0px', height: "100%", onlyScrollBar: true});
	}
	
	if(!notes || typeof notes != "object" || notes.length <= 0) {
		// 如果没有, 那么是不是应该hide editor?
		if(!forNewNote) {
			Note.showEditorMask();
		}
		return;
	}
	Note.hideEditorMask();
	// 新建笔记时会先创建一个新笔记, 所以不能清空
	if(forNewNote == undefined) {
		forNewNote = false;
	}
	if(!forNewNote) {
		Note.noteItemListO.html(""); // 清空
	}
	
	// 20个一次
	var len = notes.length;
	var c = Math.ceil(len/20);
	
	Note._renderNotes(notes, forNewNote, isShared, 1);
	
	// 先设置缓存
	for(var i = 0; i < len; ++i) {
		var note = notes[i];
		// 不清空
		// 之前是addNoteCache, 如果是搜索出的, 会把内容都重置了
		Note.setNoteCache(note, false);
		
		// 如果是共享的笔记本, 缓存也放在Share下
		if(isShared) {
			Share.setCache(note);
		}
	}
	
	for(var i = 1; i < c; ++i) {
		setTimeout(
			(function(i) {
				// 防止还没渲染完就点击另一个notebook了
				return function() {
					if(renderNotesC == Note.renderNotesC) {
						Note._renderNotes(notes, forNewNote, isShared, i+1);
					}
				}
			})(i), i*2000);
	}
}
Note._renderNotes = function(notes, forNewNote, isShared, tang) { // 第几趟
	var baseClasses = "item-my";
	if(isShared) {
		baseClasses = "item-shared";
	}
	
	var len = notes.length;
	for(var i = (tang-1)*20; i < len && i < tang*20; ++i) {
		var classes = baseClasses;
		if(!forNewNote && i == 0) {
			classes += " item-active";
		}
		var note = notes[i];
		var tmp;
		note.Title = trimTitle(note.Title);
		if(note.ImgSrc) {
			tmp = tt(Note.itemTpl, classes, note.NoteId, note.ImgSrc, note.Title, Notebook.getNotebookTitle(note.NotebookId), goNowToDatetime(note.UpdatedTime), note.Desc);
		} else {
			tmp = tt(Note.itemTplNoImg, classes, note.NoteId, note.Title, Notebook.getNotebookTitle(note.NotebookId), goNowToDatetime(note.UpdatedTime), note.Desc);
		}
		if(!note.IsBlog) {
			tmp = $(tmp);
			tmp.find(".item-blog").hide();
		}
		Note.noteItemListO.append(tmp);
		
		/*
		// 共享的note也放在Note的cache一份
		if(isShared) {
			note.IsShared = true; // 注明是共享的
		}
		
		// 不清空
		// 之前是addNoteCache, 如果是搜索出的, 会把内容都重置了
		Note.setNoteCache(note, false);
		
		// 如果是共享的笔记本, 缓存也放在Share下
		if(isShared) {
			Share.setCache(note);
		}
		*/
	}
} 

// 新建一个笔记
// 要切换到当前的notebook下去新建笔记
// isShare时fromUserId才有用
// 3.8 add isMarkdown
Note.newNote = function(notebookId, isShare, fromUserId, isMarkdown) {
	// 切换编辑器
	switchEditor(isMarkdown);
	Note.hideEditorMask();
	
	// 防止从共享read only跳到添加
	Note.hideReadOnly();
	
	Note.stopInterval();
	// 保存当前的笔记
	Note.curChangedSaveIt();
	
	var note = {NoteId: getObjectId(), Title: "", Tags:[], Content:"", NotebookId: notebookId, IsNew: true, FromUserId: fromUserId, IsMarkdown: isMarkdown}; // 是新的
	// 添加到缓存中
	Note.addNoteCache(note);
	
	// 清空附件数
	Attach.clearNoteAttachNum();
	
	// 是否是为共享的notebook添加笔记, 如果是, 则还要记录fromUserId
	var newItem = "";
	
	var baseClasses = "item-my";
	if(isShare) {
		baseClasses = "item-shared";
	}
	
	var notebook = Notebook.getNotebook(notebookId);
	var notebookTitle = notebook ? notebook.Title : "";
	var curDate = getCurDate();
	if(isShare) {
		newItem = tt(Note.newItemTpl, baseClasses, fromUserId, note.NoteId, note.Title, notebookTitle, curDate, "");
	} else {
		newItem = tt(Note.newItemTpl, baseClasses, "", note.NoteId, note.Title, notebookTitle, curDate, "");
	}
	
	// notebook是否是Blog
	if(!notebook.IsBlog) {
		newItem = $(newItem);
		newItem.find(".item-blog").hide();
	}
	
	// 是否在当前notebook下, 不是则切换过去, 并得到该notebook下所有的notes, 追加到后面!
	if(!Notebook.isCurNotebook(notebookId)) {
		// 先清空所有
		Note.clearAll();
		
		// 插入到第一个位置
		Note.noteItemListO.prepend(newItem);
		
		// 改变为当前的notebookId
		// 会得到该notebookId的其它笔记
		if(!isShare) {
			Notebook.changeNotebookForNewNote(notebookId);
		} else {
			Share.changeNotebookForNewNote(notebookId);
		}
	} else {
		// 插入到第一个位置
		Note.noteItemListO.prepend(newItem);
	}
	
	Note.selectTarget($(tt('[noteId="?"]', note.NoteId)));
	
	$("#noteTitle").focus();
	
	Note.renderNote(note);
	Note.renderNoteContent(note);
	Note.curNoteId = note.NoteId;
	
	// 更新数量
	Notebook.incrNotebookNumberNotes(notebookId)
	
	// 切换到写模式
	Note.toggleWriteable();
}

// 保存note ctrl + s
Note.saveNote = function(e) {
	var num = e.which ? e.which : e.keyCode;
	// 保存
    if((e.ctrlKey || e.metaKey) && num == 83 ) { // ctrl + s or command + s
    	Note.curChangedSaveIt();
    	e.preventDefault();
    	return false;
    } else {
    }
};

// 删除或移动笔记后, 渲染下一个或上一个
Note.changeToNext = function(target) {
	var $target = $(target);
	var next = $target.next();
	if(!next.length) {
		var prev = $target.prev();
		if(prev.length) {
			next = prev;
		} else {
			// 就它一个
			Note.showEditorMask();
			return;
		}
	}
	
	Note.changeNote(next.attr("noteId"));
}

// 删除笔记
// 1. 先隐藏, 成功后再移除DOM
// 2. ajax之 noteId
// Share.deleteSharedNote调用
Note.deleteNote = function(target, contextmenuItem, isShared) {
	// 如果删除的是已选中的, 赶紧设置curNoteId = null
	if($(target).hasClass("item-active")) {
		// -1 停止定时器
		Note.stopInterval();
		// 不保存
		Note.curNoteId = null;
		// 清空信息
		Note.clearNoteInfo();
	}
	
	noteId = $(target).attr("noteId");
	if(!noteId) {
		return;
	}
	// 1
	$(target).hide();
	
	// 2
	var note = Note.cache[noteId];
	var url = "/note/deleteNote"
	if(note.IsTrash) {
		url = "/note/deleteTrash";
	} else {
		// 减少数量
		Notebook.minusNotebookNumberNotes(note.NotebookId);
	}
	
	ajaxGet(url, {noteId: noteId, userId: note.UserId, isShared: isShared}, function(ret) {
		if(ret) {
			Note.changeToNext(target);
			
			$(target).remove();
			
			// 删除缓存
			if(note) {
				Note.clearCacheByNotebookId(note.NotebookId);
				delete Note.cache[noteId];
			}
			
			showMsg("删除成功!", 500);
		} else {
			// 弹出信息 popup 不用点确认的
			$(target).show();
			showMsg("删除失败!", 2000);
		}
	});
	
}

// 显示共享信息
Note.listNoteShareUserInfo = function(target) {
	var noteId = $(target).attr("noteId");
	showDialogRemote("/share/listNoteShareUserInfo", {noteId: noteId});
}
	
// 共享笔记
Note.shareNote = function(target) {
	var title = $(target).find(".item-title").text();
	showDialog("dialogShareNote", {title: getMsg("shareToFriends") + "-" + title});
	
	setTimeout(function() {
		$("#friendsEmail").focus();
	}, 500);
	
	var noteId = $(target).attr("noteId");
	shareNoteOrNotebook(noteId, true);
}

// 历史记录
Note.listNoteContentHistories = function() {
	// 弹框
	$("#leanoteDialog #modalTitle").html(getMsg("history"));
	$content = $("#leanoteDialog .modal-body");
	$content.html("");
	$("#leanoteDialog .modal-footer").html('<button type="button" class="btn btn-default" data-dismiss="modal">' + getMsg("close") + '</button>');
	options = {}
	options.show = true;
	$("#leanoteDialog").modal(options);
	
	ajaxGet("/noteContentHistory/listHistories", {noteId: Note.curNoteId}, function(re) {
		if(!isArray(re)) {$content.html(getMsg("noHistories")); return}
		// 组装成一个tab
		var str = "<p>" + getMsg("historiesNum") + '</p><div id="historyList"><table class="table table-hover">';
		note = Note.cache[Note.curNoteId];
		var s = "div"
		if(note.IsMarkdown) {
			s = "pre";
		}
		for (i in re) {
			var content = re[i]
			content.Ab = Note.genAbstract(content.Content, 200);
			// 为什么不用tt(), 因为content可能含??
			str += '<tr><td seq="' +  i + '">#' + (i+1) +'<' + s + ' class="each-content">' + content.Ab + '</' + s + '> <div class="btns">' + getMsg("datetime") + ': <span class="label label-default">' + goNowToDatetime(content.UpdatedTime) + '</span> <button class="btn btn-default all">' + getMsg("unfold") + '</button> <button class="btn btn-primary back">' + getMsg('restoreFromThisVersion') + '</button></div></td></tr>';
		}
		str += "</table></div>";
		$content.html(str);
		$("#historyList .all").click(function() {
			$p = $(this).parent().parent();
			var seq = $p.attr("seq");
			var $c = $p.find(".each-content");
			var info = re[seq]; 
			if(!info.unfold) { // 默认是折叠的
				$(this).text(getMsg("fold")); // 折叠
				$c.html(info.Content);
				info.unfold = true;
			} else {
				$(this).text(getMsg("unfold")); // 展开
				$c.html(info.Ab);
				info.unfold = false
			}
		});
		
		// 还原
		$("#historyList .back").click(function() {
			$p = $(this).parent().parent();
			var seq = $p.attr("seq");
			if(confirm(getMsg("confirmBackup"))) {
				// 保存当前版本
				Note.curChangedSaveIt();
				// 设置之
				note = Note.cache[Note.curNoteId];
				setEditorContent(re[seq].Content, note.IsMarkdown);
				//
				hideDialog();
			}
		});
		
	});
}

//--------------
// read only

Note.showReadOnly = function() {
	Note.isReadOnly = true;
	// $("#noteRead").show();
	
	$('#note').addClass('read-only');
}
Note.hideReadOnly = function() {
	Note.isReadOnly = false;
	$('#note').removeClass('read-only');
	$("#noteRead").hide();
}
// read only
Note.renderNoteReadOnly = function(note) {
	Note.showReadOnly();
	$("#noteReadTitle").html(note.Title || getMsg("unTitled"));
	
	Tag.renderReadOnlyTags(note.Tags);
	
	$("#noteReadCreatedTime").html(goNowToDatetime(note.CreatedTime));
	$("#noteReadUpdatedTime").html(goNowToDatetime(note.UpdatedTime));
}
Note.renderNoteContentReadOnly = function(note) {
}

//---------------------------
// 搜索
// 有点小复杂, 因为速度过快会导致没加载完, 然后就保存上一个 => 致使标题没有
// 为什么会标题没有?
Note.lastSearch = null;
Note.lastKey = null; // 判断是否与上一个相等, 相等就不查询, 如果是等了很久再按enter?
Note.lastSearchTime = new Date();
Note.isOver2Seconds = false;
Note.isSameSearch = function(key) {
	// 判断时间是否超过了1秒, 超过了就认为是不同的
	var now = new Date();
	var duration = now.getTime() - Note.lastSearchTime.getTime();
	Note.isOver2Seconds = duration > 2000 ? true : false;
	if(!Note.lastKey || Note.lastKey != key || duration > 1000) {
		Note.lastKey = key;
		Note.lastSearchTime = now;
		return false;
	}
	
	if(key == Note.lastKey) {
		return true;
	}
	
	Note.lastSearchTime = now;
	Note.lastKey = key;
	return false;
}

Note.searchNote = function() {
	var val = $("#searchNoteInput").val();
	if(!val) {
		// 定位到all
		Notebook.changeNotebook("0");
		return;
	}
	// 判断是否与上一个是相同的搜索, 是则不搜索
	if(Note.isSameSearch(val)) {
		return;
	}
	
	// 之前有, 还有结束的
	if(Note.lastSearch) {
		Note.lastSearch.abort();
	}
	
	// 步骤与tag的搜索一样 
	// 1
	Note.curChangedSaveIt();
	
	// 2 先清空所有
	Note.clearAll();
	
	// 发送请求之
	// 先取消上一个
	showLoading();
	Note.lastSearch = $.post("/note/searchNote", {key: val}, function(notes) {
		hideLoading();
		if(notes) {
			// 成功后设为空
			Note.lastSearch = null;
			// renderNotes只是note列表加载, 右侧笔记详情还没加载
			// 这个时候, 定位第一个, 保存之前的,
			// 	如果: 第一次搜索, renderNotes OK, 还没等到changeNote时
			//		第二次搜索来到, Note.curChangedSaveIt();
			//		导致没有标题了
			// 不是这个原因, 下面的Note.changeNote会导致保存
			
			// 设空, 防止发生上述情况
			// Note.curNoteId = "";
			
			Note.renderNotes(notes);
			if(!isEmpty(notes)) {
				Note.changeNote(notes[0].NoteId, false/*, true || Note.isOver2Seconds*/); // isShare, needSaveChanged?, 超过2秒就要保存
			}
		} else {
			// abort的
		}
	});
	// Note.lastSearch.abort();
}

//----------
//设为blog/unset
Note.setNote2Blog = function(target) {
	var noteId = $(target).attr("noteId");
	var note = Note.cache[noteId];
	var isBlog = true;
	if(note.IsBlog != undefined) {
		isBlog = !note.IsBlog;
	}
	// 标志添加/去掉
	if(isBlog) {
		$(target).find(".item-blog").show();
	} else {
		$(target).find(".item-blog").hide();
	}
	ajaxPost("/note/setNote2Blog", {noteId: noteId, isBlog: isBlog}, function(ret) {
		if(ret) {
			Note.setNoteCache({NoteId: noteId, IsBlog: isBlog}, false); // 不清空NotesByNotebookId缓存
		}
	});
}

// 设置notebook的blog状态
// 当修改notebook是否是blog时调用
Note.setAllNoteBlogStatus = function(notebookId, isBlog) {
	if(!notebookId) {
		return;
	}
	var notes = Note.getNotesByNotebookId(notebookId);
	if(!isArray(notes)) {
		return;
	}
	var len = notes.length;
	if(len == 0) {
		for(var i in Note.cache) {
			if(Note.cache[i].NotebookId == notebookId) {
				Note.cache[i].IsBlog = isBlog;
			}
		}
	} else {
		for(var i = 0; i < len; ++i) {
			notes[i].IsBlog = isBlog;
		}
	}
}

// 移动
Note.moveNote = function(target, data) {
	var noteId = $(target).attr("noteId");
	var note = Note.cache[noteId];
	var notebookId = data.notebookId;
	
	if(!note.IsTrash && note.NotebookId == notebookId) {
		return;
	}
	
	// 修改数量
	Notebook.incrNotebookNumberNotes(notebookId);
	if(!note.IsTrash) {
		Notebook.minusNotebookNumberNotes(note.NotebookId);
	}
	
	ajaxGet("/note/moveNote", {noteId: noteId, notebookId: notebookId}, function(ret) {
		if(ret && ret.NoteId) {
			if(note.IsTrash) {
				Note.changeToNext(target);
				$(target).remove();
				Note.clearCacheByNotebookId(notebookId);
			} else {
				// 不是trash, 移动, 那么判断是当前是否是all下
				// 不在all下, 就删除之
				// 如果当前是active, 那么clearNoteInfo之
				if(!Notebook.curActiveNotebookIsAll()) {
					Note.changeToNext(target);
					if($(target).hasClass("item-active")) {
						Note.clearNoteInfo();
					}
					$(target).remove();
				} else {
					// 不移动, 那么要改变其notebook title
					$(target).find(".note-notebook").html(Notebook.getNotebookTitle(notebookId));
				}
				
				// 重新清空cache 之前的和之后的
				Note.clearCacheByNotebookId(note.NotebookId);
				Note.clearCacheByNotebookId(notebookId);
			}
			
			// 改变缓存
			Note.setNoteCache(ret)
		}
	});
}

// 复制
// data是自动传来的, 是contextmenu数据 
Note.copyNote = function(target, data, isShared) {
	var noteId = $(target).attr("noteId");
	var note = Note.cache[noteId];
	var notebookId = data.notebookId;
	
	// trash不能复制, 不能复制给自己
	if(note.IsTrash || note.NotebookId == notebookId) {
		return;
	}
	
	var url = "/note/copyNote";
	var data = {noteId: noteId, notebookId: notebookId};
	if(isShared) {
		url = "/note/copySharedNote";
		data.fromUserId = note.UserId;
	}
	
	ajaxGet(url, data, function(ret) {
		if(ret && ret.NoteId) {
			// 重新清空cache 之后的
			Note.clearCacheByNotebookId(notebookId);
			// 改变缓存, 添加之
			Note.setNoteCache(ret)
		}
	});
	
	// 增加数量
	Notebook.incrNotebookNumberNotes(notebookId)
};

// 删除笔记标签
// item = {noteId => usn}
Note.deleteNoteTag = function(item, tag) {
	if(!item) {
		return;
	}
	for(var noteId in item) {
		var note = Note.getNote(noteId);
		if(note) {
			note.Tags = note.Tags || [];
			for(var i in note.Tags) {
				if(note.Tags[i] == tag) {
					note.Tags.splice(i, 1);
					continue;
				}
			}
			// 如果当前笔记是展示的笔记, 则重新renderTags
			if(noteId == Note.curNoteId) {
				Tag.renderTags(note.Tags);
			}
		}
	}
};

// readonly
Note.readOnly = true;
// 切换只读模式
Note.toggleReadOnly = function() {
	if(LEA.em && LEA.em.isWriting()) {
		return Note.toggleWriteable();
	}
	
	var me = this;
	var note = me.getCurNote();

	// console.log('(((((((((((((((((((((((');
	// tinymce
	var $editor = $('#editor');
	$editor.addClass('read-only').removeClass('all-tool'); // 不要全部的

	// 不可写
	$('#editorContent').attr('contenteditable', false);

	// markdown
	$('#mdEditor').addClass('read-only');

	if(!note) {
		return;
	}
	
	if(note.IsMarkdown) {
		$('#mdInfoToolbar .created-time').html(goNowToDatetime(note.CreatedTime));
		$('#mdInfoToolbar .updated-time').html(goNowToDatetime(note.UpdatedTime));
	}
	else {
		$('#infoToolbar .created-time').html(goNowToDatetime(note.CreatedTime));
		$('#infoToolbar .updated-time').html(goNowToDatetime(note.UpdatedTime));
	}
	
	if(note.readOnly) {
		return;
	}

	if(!note.IsMarkdown) {
		// 里面的pre也设为不可写
		$('#editorContent pre').each(function() {
			LeaAce.setAceReadOnly($(this), true);
		});
	}

	note.readOnly = true;
	Note.readOnly = true;
};
// 切换到编辑模式
Note.toggleWriteable = function() {
	var me = this;

	// $('#infoToolbar').hide();
	$('#editor').removeClass('read-only');
	$('#editorContent').attr('contenteditable', true);

	// markdown
	$('#mdEditor').removeClass('read-only');

	var note = me.getCurNote();
	if(!note) {
		return;
	}

	if(!note.readOnly) {
		return;
	}

	if(!note.IsMarkdown) {
		// 里面的pre也设为不可写
		$('#editorContent pre').each(function() {
			LeaAce.setAceReadOnly($(this), false);
		});
	}
	else {
		if(MD) {
			MD.onResize();
		}
	}

	note.readOnly = false;
	Note.readOnly = false;
};

// 这里速度不慢, 很快
Note.getContextNotebooks = function(notebooks) {
	var moves = [];
	var copys = [];
	var copys2 = [];
	for(var i in notebooks) {
		var notebook = notebooks[i];
		var move = {text: notebook.Title, notebookId: notebook.NotebookId, action: Note.moveNote}
		var copy = {text: notebook.Title, notebookId: notebook.NotebookId, action: Note.copyNote}
		var copy2 = {text: notebook.Title, notebookId: notebook.NotebookId, action: Share.copySharedNote}
		if(!isEmpty(notebook.Subs)) {
			var mc = Note.getContextNotebooks(notebook.Subs);
			move.items = mc[0];
			copy.items = mc[1];
			copy2.items = mc[2];
			move.type = "group";
			move.width = 150;
			copy.type = "group";
			copy.width = 150;
			copy2.type = "group";
			copy2.width = 150;
		}
		moves.push(move);
		copys.push(copy);
		copys2.push(copy2);
	}
	return [moves, copys, copys2];
}
// Notebook调用
Note.contextmenu = null;
Note.notebooksCopy = []; // share会用到
Note.initContextmenu = function() {
	var self = Note;
	if(Note.contextmenu) {
		Note.contextmenu.destroy();
	}
	// 得到可移动的notebook
	var notebooks = Notebook.everNotebooks;
	var mc = self.getContextNotebooks(notebooks);
	
	var notebooksMove = mc[0];
	var notebooksCopy = mc[1];
	self.notebooksCopy = mc[2];
	
	//---------------------
	// context menu
	//---------------------
	var noteListMenu = {
		width: 180, 
		items: [
			{ text: getMsg("shareToFriends"), alias: 'shareToFriends', icon: "", faIcon: "fa-share-square-o", action: Note.listNoteShareUserInfo},
			{ type: "splitLine" },
			{ text: getMsg("publicAsBlog"), alias: 'set2Blog', faIcon: "fa-bold", action: Note.setNote2Blog },
			{ text: getMsg("cancelPublic"), alias: 'unset2Blog', faIcon: "fa-undo", action: Note.setNote2Blog },
			{ type: "splitLine" },
			{ text: getMsg("delete"), icon: "", faIcon: "fa-trash-o", action: Note.deleteNote },
			{ text: getMsg("move"), alias: "move", faIcon: "fa-arrow-right",
				type: "group", 
				width: 180, 
				items: notebooksMove
			},
			{ text: getMsg("copy"), alias: "copy", icon:"", faIcon: "fa-copy",
				type: "group", 
				width: 180, 
				items: notebooksCopy
			}
		], 
		onShow: applyrule,
		onContextMenu: beforeContextMenu,
		
		parent: "#noteItemList",
		children: ".item-my",
	}
		
	function menuAction(target) {
		// $('#myModal').modal('show')
		showDialog("dialogUpdateNotebook", {title: "修改笔记本", postShow: function() {
		}});
	}
	function applyrule(menu) {
		var noteId = $(this).attr("noteId");
		var note = Note.cache[noteId];
		if(!note) {
			return;
		}
		// 要disable的items
		var items = [];
		
		// 如果是trash, 什么都不能做
		if(note.IsTrash) {
			items.push("shareToFriends");
			items.push("shareStatus");
			items.push("unset2Blog");
			items.push("set2Blog");
			items.push("copy");
		} else {
			// 是否已公开为blog
			if(!note.IsBlog) {
				items.push("unset2Blog");
			} else {
				items.push("set2Blog");
			}
			
			// 移动与复制不能是本notebook下
			var notebookTitle = Notebook.getNotebookTitle(note.NotebookId);
			items.push("move." + notebookTitle);
			items.push("copy." + notebookTitle);
		}

        menu.applyrule({
        	name: "target..",
            disable: true,
            items: items
        });		
	   
	}
	function beforeContextMenu() {
	    return this.id != "target3";
	}
	
	// 这里很慢!!
	Note.contextmenu = $("#noteItemList .item-my").contextmenu(noteListMenu);
}

// 附件
// 笔记的附件需要ajax获取
// 建一张附件表? attachId, noteId, 其它信息 
// note里有attach_nums字段记录个数
// [ok]
var Attach = {
	loadedNoteAttachs: {}, // noteId => [attch1Info, attach2Info...] // 按笔记
	attachsMap: {}, // attachId => attachInfo
	init: function() {
		var self = this;
		// 显示attachs
		$("#showAttach").click(function() {
			// self._bookmark = tinymce.activeEditor.selection.getBookmark();
			self.renderAttachs(Note.curNoteId);
		});
		// 防止点击隐藏
		self.attachListO.click(function(e) {
			e.stopPropagation();
		});
		// 删除
		self.attachListO.on("click", ".delete-attach", function(e) {
			e.stopPropagation();
			var attachId = $(this).closest('li').data("id");
			var t = this;
			if(confirm("Are you sure to delete it ?")) {
				$(t).button("loading");
				ajaxPost("/attach/deleteAttach", {attachId: attachId}, function(re) {
					$(t).button("reset");
					if(reIsOk(re)) {
						self.deleteAttach(attachId);
					} else {
						alert(re.Msg);
					}
				});
			}
		});
		// 下载
		self.attachListO.on("click", ".download-attach", function(e) {
			e.stopPropagation();
			var attachId = $(this).closest('li').data("id");
			window.open(UrlPrefix + "/attach/download?attachId=" + attachId);
			// location.href = "/attach/download?attachId=" + attachId;
		});
		// 下载全部
		self.downloadAllBtnO.click(function() {
			window.open(UrlPrefix + "/attach/downloadAll?noteId=" + Note.curNoteId);
			// location.href = "/attach/downloadAll?noteId=" + Note.curNoteId;
		});
		
		// make link
		self.attachListO.on("click", ".link-attach", function(e) {
			e.stopPropagation();
			var attachId = $(this).closest('li').data("id");
			var attach = self.attachsMap[attachId];
			var src = UrlPrefix + "/attach/download?attachId=" + attachId;
			if(LEA.isMarkdownEditor() && MD) {
				MD.insertLink(src, attach.Title);
			} else {
				// tinymce.activeEditor.selection.moveToBookmark(self._bookmark);
				tinymce.activeEditor.insertContent('<a target="_blank" href="' + src + '">' + attach.Title + '</a>');
			}
		});
		
		// make all link
		self.linkAllBtnO.on("click",function(e) {
			e.stopPropagation();
			var note = Note.getCurNote();
			if(!note) {
				return;
			}
			var src = UrlPrefix +  "/attach/downloadAll?noteId=" + Note.curNoteId
			var title = note.Title ? note.Title + ".tar.gz" : "all.tar.gz";
			
			if(LEA.isMarkdownEditor() && MD) {
				MD.insertLink(src, title);
			} else {
				tinymce.activeEditor.insertContent('<a target="_blank" href="' + src + '">' + title + '</a>');
			}
		});
	},
	attachListO: $("#attachList"),
	attachNumO: $("#attachNum"),
	attachDropdownO: $("#attachDropdown"),
	downloadAllBtnO: $("#downloadAllBtn"),
	linkAllBtnO: $("#linkAllBtn"),
	// 添加笔记时
	clearNoteAttachNum: function() {
		var self = this;
		self.attachNumO.html("").hide();
	},
	renderNoteAttachNum: function(noteId, needHide) {
		var self = this;
		var note = Note.getNote(noteId);
		if(note.AttachNum) {
			self.attachNumO.html("(" + note.AttachNum + ")").show();
			self.downloadAllBtnO.show();
			self.linkAllBtnO.show();
		} else {
			self.attachNumO.hide();
			self.downloadAllBtnO.hide();
			self.linkAllBtnO.hide();
		}
		
		// 隐藏掉
		if(needHide) {
			self.attachDropdownO.removeClass("open");
		}
	},
	_renderAttachs: function(attachs) {
		var self = this;
		// foreach 循环之
		/*
		<li class="clearfix">
			<div class="attach-title">leanote官abcefedafadfadfadfadfad方文档.doc</div>
			<div class="attach-process">
				<button class="btn btn-sm btn-warning">Delete</button>
				<button class="btn btn-sm btn-deafult">Download</button>
			</div>
		</li>
		*/
		var html = "";
		var attachNum = attachs.length;
		for(var i = 0; i < attachNum; ++i) {
			var each = attachs[i];
			html += '<li class="clearfix" data-id="' + each.AttachId + '">' +
						'<div class="attach-title">' + each.Title + '</div>' + 
						'<div class="attach-process"> ' +
						'	  <button class="btn btn-sm btn-warning delete-attach" data-loading-text="..."><i class="fa fa-trash-o"></i></button> ' + 
						'	  <button type="button" class="btn btn-sm btn-primary download-attach"><i class="fa fa-download"></i></button> ' +
						'	  <button type="button" class="btn btn-sm btn-default link-attach" title="Insert link into content"><i class="fa fa-link"></i></button> ' +
						'</div>' + 
					'</li>';
			self.attachsMap[each.AttachId] = each;
		}
		self.attachListO.html(html);
		
		// 设置数量
		var note = Note.getCurNote();
		if(note) {
			note.AttachNum = attachNum;
			self.renderNoteAttachNum(note.NoteId, false);
		}
	},
	// 渲染noteId的附件
	// 当点击"附件"时加载, 
	// TODO 判断是否已loaded
	_bookmark: null,
	renderAttachs: function(noteId) {
		var self = this;
		
		if(self.loadedNoteAttachs[noteId]) {
			self._renderAttachs(self.loadedNoteAttachs[noteId]);
			return;
		}
		// 显示loading
		self.attachListO.html('<li class="loading"><img src="/images/loading-24.gif"/></li>');
		// ajax获取noteAttachs
		ajaxGet("/attach/getAttachs", {noteId: noteId}, function(ret) {
			var list = [];
			if(ret.Ok) {
				list = ret.List;
				if(!list) {
					list = [];
				}
			}
			// 添加到缓存中
			self.loadedNoteAttachs[noteId] = list;
			self._renderAttachs(list);
		});
	},
	// 添加附件, attachment_upload上传调用
	addAttach: function(attachInfo) {
		var self = this;
		if(!self.loadedNoteAttachs[attachInfo.NoteId]) {
			self.loadedNoteAttachs[attachInfo.NoteId] = [];
		}
		self.loadedNoteAttachs[attachInfo.NoteId].push(attachInfo);
		self.renderAttachs(attachInfo.NoteId);
	},
	// 删除
	deleteAttach: function(attachId) {
		var self = this;
		var noteId = Note.curNoteId;
		var attachs = self.loadedNoteAttachs[noteId];
		for(var i = 0; i < attachs.length; ++i) {
			if(attachs[i].AttachId == attachId) {
				// 删除之, 并render之
				attachs.splice(i, 1);
				break;
			}
		}
		// self.loadedNoteAttachs[noteId] = attachs;
		self.renderAttachs(noteId);
	},
	
	// 下载
	downloadAttach: function(fileId) {
		var self = this;
	},
	downloadAll: function() {
	}
}

//------------------- 事件
$(function() {
	// 附件初始化
	Attach.init();
	
	//-----------------
	// 点击笔记展示之
	// 避免iphone, ipad两次点击
	// http://stackoverflow.com/questions/3038898/ipad-iphone-hover-problem-causes-the-user-to-double-click-a-link
	$("#noteItemList").on("mouseenter", ".item", function(event) {
		if(LEA.isIpad || LEA.isIphone) {
			$(this).trigger("click");
		}
	});
	$("#noteItemList").on("click", ".item", function(event) {
		event.stopPropagation();
		var noteId = $(this).attr("noteId");
		
		// 手机端处理
		Mobile.changeNote(noteId);
		
		if(!noteId) {
			return;
		}
		// 当前的和所选的是一个, 不改变
		if(Note.curNoteId != noteId) {
			// 不用重定向到notebook
			Note.changeNoteForPjax(noteId, true, false);
		}
	});
	
	// 当前笔记可以已修改
	$('#editorContent, #wmd-input, #noteTitle').on('keyup input', function() {
		Note.curNoteIsDirtied();
	});
	/*
	$('#addTagInput').click(function() {
		Note.curNoteIsDirtied();
	});
	*/
	
	//------------------
	// 新建笔记
	// 1. 直接点击新建 OR
	// 2. 点击nav for new note
	$("#newNoteBtn, #editorMask .note").click(function() {
		var notebookId = $("#curNotebookForNewNote").attr('notebookId');
		Note.newNote(notebookId);
	});
	$("#newNoteMarkdownBtn, #editorMask .markdown").click(function() {
		var notebookId = $("#curNotebookForNewNote").attr('notebookId');
		Note.newNote(notebookId, false, "", true);
	});
	$("#notebookNavForNewNote").on("click", "li div", function() {
		var notebookId = $(this).attr("notebookId");
		if($(this).hasClass("new-note-right")) {
			Note.newNote(notebookId, false, "", true);
		} else {
			Note.newNote(notebookId);
		}
	});
	$("#searchNotebookForAdd").click(function(e) {
		e.stopPropagation();
	});
	$("#searchNotebookForAdd").keyup(function() {
		var key = $(this).val();
		Notebook.searchNotebookForAddNote(key);
	});
	$("#searchNotebookForList").keyup(function() {
		var key = $(this).val();
		Notebook.searchNotebookForList(key);
	});
	
	//---------------------------
	// 搜索, 按enter才搜索
	/*
	$("#searchNoteInput").on("keyup", function(e) {
		Note.searchNote();
	});
	*/
	$("#searchNoteInput").on("keydown", function(e) {
		var theEvent = e; // window.event || arguments.callee.caller.arguments[0];
		if(theEvent.keyCode == 13 || theEvent.keyCode == 108) {
			theEvent.preventDefault();
			Note.searchNote();
			return false;
		}
	});
	
	//--------------------
	// Note.initContextmenu();
	
	//------------
	// 文档历史
	$("#contentHistory").click(function() {
		Note.listNoteContentHistories()
	});
	
	$("#saveBtn").click(function() {
		Note.curChangedSaveIt(true);
	});
	
	// blog
	$("#noteItemList").on("click", ".item-blog", function(e) {
		e.preventDefault();
		e.stopPropagation();
		// 得到ID
		var noteId = $(this).parent().attr('noteId');
		window.open("/blog/view/" + noteId);
	});
	
	// note setting
	$("#noteItemList").on("click", ".item-my .item-setting", function(e) {
		e.preventDefault();
		e.stopPropagation();
		var $p = $(this).parent();
		Note.contextmenu.showMenu(e, $p);
	});
	
	// readony
	// 修改
	$('.toolbar-update').click(function() {
		Note.toggleWriteable();
	});
});

// 定时器启动
Note.startInterval();