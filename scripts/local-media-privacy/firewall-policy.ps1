function Test-UnrestrictedProgramBlock {
    param($Rule, $Application, $Address, $Port, $Interface, $InterfaceType, $Service, $Security)
    if ($Rule.Enabled -ne 'True' -or $Rule.Direction -ne 'Outbound' -or $Rule.Action -ne 'Block' -or $Rule.Profile -ne 'Any') { return $false }
    if ($Port.Protocol -ne 'Any' -or $Port.LocalPort -ne 'Any' -or $Port.RemotePort -ne 'Any') { return $false }
    if (@($Address.LocalAddress).Count -ne 1 -or $Address.LocalAddress -ne 'Any') { return $false }
    if (@($Interface.InterfaceAlias).Count -ne 1 -or $Interface.InterfaceAlias -ne 'Any' -or $InterfaceType.InterfaceType -ne 'Any') { return $false }
    if ($Service.Service -ne 'Any') { return $false }
    if ($Application.Package -and $Application.Package -ne 'Any') { return $false }
    if ($Security.Authentication -ne 'NotRequired' -or $Security.LocalUser -ne 'Any' -or
        $Security.RemoteUser -ne 'Any' -or $Security.RemoteMachine -ne 'Any') { return $false }
    $addresses = @($Address.RemoteAddress)
    $required = @('0.0.0.0-126.255.255.255', '128.0.0.0-255.255.255.255', '::/0')
    return ('Any' -in $addresses -or @($required | Where-Object { $_ -notin $addresses }).Count -eq 0)
}
