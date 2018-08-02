    
Sub errHandler(output_path, errMsg, errNum)
    dim txt
    WScript.Echo "error"
    
    Set txt = CreateObject("scripting.filesystemobject").CreateTextFile(output_path & "error.csv", True)

    txt.Write errMsg & "|" & errNum
    
    txt.Close       
End Sub

sub runQuery()
    On Error resume next
    Dim cnn, rs, txt, fs, query, output_name, output_path
      
    '//Collect the args
    query = WScript.Arguments.Item(0)    
    output_name = Trim(WScript.Arguments(1))
    output_path = Trim(WScript.Arguments(2))
    
    if err <> 0 then call  errHandler(output_path, Err.Description, Err.Number):WScript.Quit

    
    '//ensure file path ends with a slash
    output_path = Replace(output_path, "/", "\")
    If Mid(output_path, Len(output_path)) <> "\" Then output_path = output_path & "\"
    
    
    '//Delete pervious output files if they already exist
    set fs = CreateObject("scripting.filesystemobject")
    If fs.FileExists(output_path & output_name & ".csv") Then fs.DeleteFile(output_path & output_name & ".csv")
    If fs.FileExists(output_path & "error.csv") Then fs.DeleteFile(output_path & "error.csv")
    
    if err <> 0 then call  errHandler(output_path, Err.Description, Err.Number):WScript.Quit

    Set cnn = CreateObject("ADODB.Connection")
    Set rs = CreateObject("ADODB.Recordset")
        
    cnn.Open "DSN=WinSol_ODBC;Description=WinSol Default ODBC Link;IniFile=\\szylns\reports\\WinSol_ODBC_402.ini;Prefix=\\szylns\odbcdata\;Company=11;CacheSize=50;DirtyReads=1;BurstMode=1;EnforceNULLDate=1;SERVER=NotTheServer"
       
    rs.Open query, cnn ', adOpenStatic

    If rs.bof Or rs.EOF Then
        WScript.Echo "No records found"
        WScript.Quit
    End If
    
    if err <> 0 then call  errHandler(output_path, Err.Description, Err.Number):WScript.Quit
    Set txt = fs.CreateTextFile(output_path & output_name & ".csv", True)
           
    'txt.Write output_name & vbNewLine
    txt.Write rs.GetString(, , "|", vbCrLf, "")
    txt.Close
    
    
    cnn.Close
    
    if err <> 0 then call  errHandler(output_path, Err.Description, Err.Number):WScript.Quit

    WScript.Echo output_name
    Set txt = Nothing
    Set cnn = Nothing
    Set rs = Nothing
    
end sub
    
call runQuery