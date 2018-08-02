'//handles collecting Arguments from the command line
'//calls the right sub according to expected output_name
'//handles writing results to the file system
sub main()
	Dim query ,output_name, output_path, txt, fs, rs, output, outputData
	'//Collect the args
    query = WScript.Arguments.Item(0)    
    output_name = Trim(WScript.Arguments(1))
    output_path = Trim(WScript.Arguments(2))

	if err <> 0 then call  errHandler(output_path, Err.Description, "errNumber " & Err.Number):WScript.Quit

	'//ensure file path ends with a slash
    output_path = Replace(output_path, "/", "\")
    If Mid(output_path, Len(output_path)) <> "\" Then output_path = output_path & "\"
        
    '//Delete pervious output files if they already exist
    set fs = CreateObject("scripting.filesystemobject")
    If fs.FileExists(output_path & output_name & ".csv") Then fs.DeleteFile(output_path & output_name & ".csv")
    If fs.FileExists(output_path & "error.csv") Then fs.DeleteFile(output_path & "error.csv")

    if err <> 0 then call  errHandler(output_path, Err.Description, "errNumber " & Err.Number):WScript.Quit  

    'run the desired fn 
   	'output of fn should always be a delimitted string
    select case output_name
    	case "orders", "receipts", "new_skus", "set_breakdown", "po_query", "old_po_query", "vendor_skus"
    		output = pfQuery(query, output_path)

    	case "order_line_editor"
    		output = setData(output_path, "Order Lines Editor Template.xlsm")
            
            outputData = Split(output, "|")

            if not outputData(0) = "Operation:successful" then                
                call  errHandler(output_path, outputData(0), outputData(1))
                WScript.Quit
            end if
        case "sku_line_editor"
            output = setData(output_path, "PF SKU Editor.xlsm")
            
            outputData = Split(output, "|")

            if not outputData(0) = "Operation:successful" then                
                call  errHandler(output_path, outputData(0), outputData(1))
                WScript.Quit
            end if
            
        case "session_picksheet"
            output = setData(output_path, "Session Picksheet.xlsm")
            
            outputData = Split(output, "|")

            if not outputData(0) = "Operation:successful" then                
                call  errHandler(output_path, outputData(0), outputData(1))
                WScript.Quit
            end if
        case "asin_editor_data"
            output = setData(output_path, "ASIN Data Editor Template")
            
            outputData = Split(output, "|")

            if not outputData(0) = "Operation:successful" then                
                call  errHandler(output_path, outputData(0), outputData(1))
                WScript.Quit
            end if            
    
    	case else
    
    		call  errHandler(output_path, "Unexpected output_name!!!", 0):WScript.Quit  
    end select

    '//write output to the file system
    Set txt = fs.CreateTextFile(output_path & output_name & ".csv", True)           
    txt.Write output
    txt.Close

    if err <> 0 then call  errHandler(output_path, Err.Description, "errNumber " & Err.Number):WScript.Quit

    WScript.Echo output_name

    set fs = Nothing
    Set txt = Nothing
    
end sub

'//perfomrs query to point force and return data as a string
function pfQuery(query, output_path)
   

    Dim cnn, rs
    Set cnn = CreateObject("ADODB.Connection")
    Set rs = CreateObject("ADODB.Recordset")
        
    cnn.Open "DSN=WinSol_ODBC;Description=WinSol Default ODBC Link;IniFile=\\szylns\reports\\WinSol_ODBC_402.ini;Prefix=\\szylns\odbcdata\;Company=11;CacheSize=50;DirtyReads=1;BurstMode=1;EnforceNULLDate=1;SERVER=NotTheServer"
       
    rs.Open query, cnn ', adOpenStatic

    If rs.bof Or rs.EOF Then
        pfQuery = "No Records Found|null"
        Exit Function
    End If
    
    if err <> 0 then call  errHandler(output_path, Err.Description, "errNumber " & Err.Number):WScript.Quit

    pfQuery =  rs.GetString(, , "|_|", vbCrLf, "")
   
    cnn.Close    
    Set cnn = Nothing
    Set rs = Nothing

end function

'//write data from one workbook to another using ADODB
function setData(output_path, fileName)
    
    Dim xlApp, wb

    Set xlApp = CreateObject("Excel.Application")
    
    Set wb = xlApp.Workbooks.Open( Replace(output_path, "PF_OUT\", "public\excel templates\" ) & fileName)    

    setData = xlApp.Run("setData")
    wb.close true 

    if err <> 0 then call  errHandler(output_path, Err.Description, "errNumber " & Err.Number):WScript.Quit

    set wb = Nothing
    set xlApp = Nothing
end function

Sub errHandler(output_path, errMsg, errNum)
    dim txt
    WScript.Echo "error"
    
    Set txt = CreateObject("scripting.filesystemobject").CreateTextFile(output_path & "error.csv", True)

    txt.Write errMsg & "|" & errNum
    
    txt.Close       
End Sub


' sub ediInsert(output_path, query){
'     Dim cnn

'     Set cnn = CreateObject("ADODB.Connection");

'     With cnn       
'         .ConnectionString = "Provider=SQLOLEDB.1;Integrated Security=SSPI;Persist Security Info=True;Initial Catalog=VC_ShipBill;Data Source=NYEVRVSQL001;Use Procedure for Prepare=1;Auto Translate=True;Packet Size=4096;Workstation ID=UTAH;Use Encryption for Data=False;Tag with column collation when possible=False"
'         .Open
'     End With

'     cnn.Execute query    
' }
call main  